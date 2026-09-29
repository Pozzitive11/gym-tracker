import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";
import { ApiError, unwrap } from "./unwrap";

export type ActiveWorkout = components["schemas"]["ActiveWorkoutResponseDto"];
export type WorkoutSet = components["schemas"]["WorkoutSetResponseDto"];
type StartWorkoutBody = components["schemas"]["StartWorkoutDto"];

// null — активного тренування нема (сервер віддає 204 без тіла). Саме null,
// а не undefined: TanStack Query не дозволяє queryFn повертати undefined
export const activeWorkoutQueryOptions = queryOptions({
  queryKey: ["workouts", "active"],
  queryFn: async (): Promise<ActiveWorkout | null> =>
    unwrap(await api.GET("/workouts/active")) ?? null,
});

export function useActiveWorkoutQuery() {
  return useQuery(activeWorkoutQueryOptions);
}

export function useStartWorkoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: StartWorkoutBody) => {
      try {
        unwrap(await api.POST("/workouts", { body }));
      } catch (error) {
        // 409 — тренування з таким id уже є: попередня спроба дійшла, а
        // відповідь загубилась. Як і зі створенням програми, це успіх
        if (!(error instanceof ApiError && error.status === 409)) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: activeWorkoutQueryOptions.queryKey,
      }),
  });
}

export function useFinishWorkoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await api.POST("/workouts/{id}/finish", {
          params: { path: { id } },
        }),
      ),
    onSuccess: () => {
      // Після завершення активного нема — ставимо це одразу, без рефетчу
      queryClient.setQueryData(activeWorkoutQueryOptions.queryKey, null);
    },
  });
}

// Мутацію запису підходу (POST /workouts/{id}/sets) пише Влад — крок 12 плану
