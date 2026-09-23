import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";
import { ApiError, unwrap } from "./unwrap";

type CreateProgramBody = components["schemas"]["CreateProgramDto"];

// Ключ і опції запиту разом: кожен, хто читає чи інвалідує програми, бере
// їх звідси, а не пише рядок ["programs"] сам
export const programsQuery = queryOptions({
  queryKey: ["programs"],
  queryFn: async () => unwrap(await api.GET("/programs")),
});

export function usePrograms() {
  return useQuery(programsQuery);
}

export function useCreateProgram() {
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
    // Без інвалідації головна показала б старий список до кінця staleTime
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: programsQuery.queryKey }),
  });
}
