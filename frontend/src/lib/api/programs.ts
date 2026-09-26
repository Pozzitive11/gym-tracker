import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";
import { ApiError, unwrap } from "./unwrap";

type CreateProgramBody = components["schemas"]["CreateProgramDto"];
type UpdateProgramBody = components["schemas"]["UpdateProgramDto"];

// Ключ і опції запиту разом: кожен, хто читає чи інвалідує програми, бере
// їх звідси, а не пише рядок ["programs"] сам
export const programsQueryOptions = queryOptions({
  queryKey: ["programs"],
  queryFn: async () => unwrap(await api.GET("/programs")),
});

export function useProgramsQuery() {
  return useQuery(programsQueryOptions);
}

// Ключ ["programs", id] лежить під префіксом списку, тож invalidateQueries
// з ["programs"] без exact зачепив би й одну програму
export const programQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["programs", id],
    queryFn: async () =>
      unwrap(await api.GET("/programs/{id}", { params: { path: { id } } })),
  });

export function useProgramQuery(id: string) {
  return useQuery(programQueryOptions(id));
}

// Після будь-якого запису програм кеш окремих програм міг застаріти не лише
// для тієї, яку зберегли: активація однієї знімає isActive з усіх інших.
// Інвалідація тут не допомагає — форма редагування бере defaultValues один
// раз, при монтуванні, і змонтувалася б зі старого кешу, не дочекавшись
// рефетчу. Тож кеш інших програм видаляємо: наступне відкриття піде через
// лоадер і свіжий GET
function evictProgramDetailsFromCache(
  queryClient: QueryClient,
  exceptId?: string,
) {
  queryClient.removeQueries({
    queryKey: programsQueryOptions.queryKey,
    predicate: ({ queryKey }) =>
      queryKey.length === 2 && queryKey[1] !== exceptId,
  });
}

export function useCreateProgramMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateProgramBody) => {
      try {
        unwrap(await api.POST("/programs", { body }));
      } catch (error) {
        // 409 — програма з таким id уже є: попередня спроба дійшла, а відповідь
        // загубилась. Для юзера це успіх, не помилка (ідемпотентність за id)
        if (!(error instanceof ApiError && error.status === 409)) throw error;
      }
    },
    onSuccess: () => {
      evictProgramDetailsFromCache(queryClient);
      // Без інвалідації головна показала б старий список до кінця staleTime
      return queryClient.invalidateQueries({
        queryKey: programsQueryOptions.queryKey,
        exact: true,
      });
    },
  });
}

export function useUpdateProgramMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // PUT ідемпотентний: повтор після загубленої відповіді ставить той самий
    // стан — окремої обробки, як 409 у створенні, не треба
    mutationFn: async (body: UpdateProgramBody) =>
      unwrap(
        await api.PUT("/programs/{id}", { params: { path: { id } }, body }),
      ),
    onSuccess: (program) => {
      // PUT повертає свіже дерево — кладемо його в кеш напряму, тож наступне
      // відкриття цієї програми одразу покаже збережене, без лоадера
      queryClient.setQueryData(programQueryOptions(id).queryKey, program);
      evictProgramDetailsFromCache(queryClient, id);
      // Список лише позначаємо застарілим: змінились назва, к-сть днів і
      // вправ. exact — щоб не зачепити щойно покладену програму зайвим рефетчем
      return queryClient.invalidateQueries({
        queryKey: programsQueryOptions.queryKey,
        exact: true,
      });
    },
  });
}
