import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";
import { unwrap } from "./unwrap";

export type Exercise = components["schemas"]["ExerciseResponseDto"];
type CreateExerciseBody = components["schemas"]["CreateExerciseDto"];

// Каталог: системні вправи + свої. Міняється рідко (лише коли юзер вписує
// нову), тож довгий staleTime — повторні відкриття вибору вправи не ходять
// у мережу
export const exercisesQueryOptions = queryOptions({
  queryKey: ["exercises"],
  queryFn: async () => unwrap(await api.GET("/exercises")),
  staleTime: 5 * 60_000,
});

export function useExercisesQuery() {
  return useQuery(exercisesQueryOptions);
}

// «Знайти або створити»: сервер може повернути вже наявну вправу з такою
// назвою, тож далі користуватись треба id з відповіді, а не тим, що надіслали
export function useCreateExerciseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateExerciseBody) =>
      unwrap(await api.POST("/exercises", { body })),
    onSuccess: (exercise) => {
      // Кладемо в кеш одразу, щоб щойно вписана вправа була в списку без
      // рефетчу. Якщо вона там уже є (сервер знайшов наявну) — не дублюємо
      queryClient.setQueryData(exercisesQueryOptions.queryKey, (list) =>
        list && !list.some((e) => e.id === exercise.id)
          ? [...list, exercise].sort((a, b) => a.name.localeCompare(b.name))
          : list,
      );
    },
  });
}
