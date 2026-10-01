import {
  queryOptions,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";
import { ApiError, unwrap } from "./unwrap";

export type ActiveWorkout = components["schemas"]["ActiveWorkoutResponseDto"];
export type WorkoutSet = components["schemas"]["WorkoutSetResponseDto"];
export type PlannedExercise = components["schemas"]["PlannedExerciseDto"];
export type NextWorkout = components["schemas"]["NextWorkoutResponseDto"];
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

// Наступний день активної програми для картки на головній. null — активної
// програми нема (204)
export const nextWorkoutQueryOptions = queryOptions({
  queryKey: ["workouts", "next"],
  queryFn: async (): Promise<NextWorkout | null> =>
    unwrap(await api.GET("/workouts/next")) ?? null,
});

export function useNextWorkoutQuery() {
  return useQuery(nextWorkoutQueryOptions);
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
      // Наступний день зсунувся: головна має показати вже інший
      return queryClient.invalidateQueries({
        queryKey: nextWorkoutQueryOptions.queryKey,
      });
    },
  });
}

// ---------- запис підходу ----------

type CreateWorkoutSetBody = components["schemas"]["CreateWorkoutSetDto"];

// Спільний ключ: за ним useMutationState знаходить усі записи підходів цього
// тренування, щоб показати ще не збережені
const addSetMutationKey = (workoutId: string) =>
  ["workouts", workoutId, "sets"] as const;

// Тіло підходу (разом з id!) збирає той, хто викликає, ОДИН раз у момент
// «Підхід зроблено». Повтор — це mutate з тими самими змінними, тож сервер
// бачить той самий id і не створює дубль (ON CONFLICT DO NOTHING на бекенді)
export function useAddSetMutation(workoutId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: addSetMutationKey(workoutId),
    mutationFn: async (body: CreateWorkoutSetBody) =>
      unwrap(
        await api.POST("/workouts/{id}/sets", {
          params: { path: { id: workoutId } },
          body,
        }),
      ),
    // Самі повторюємо лише те, що може минути: збій мережі й 5xx. 4xx
    // (чужа вправа, завершене тренування) від повтору не зміниться.
    // Без мережі взагалі мутація не падає, а стає на паузу (networkMode
    // "online" за замовчуванням) і сама піде, коли мережа повернеться
    retry: (failureCount, error) =>
      failureCount < 3 && !(error instanceof ApiError && error.status < 500),
    // Мутація без підписників за замовчуванням зникає з кешу через 5 хв —
    // разом з нею зникла б червона плитка незбереженого підходу, і юзер
    // не зміг би його повторити. Тримаємо, поки жива сторінка
    gcTime: Infinity,
    onSuccess: (_data, body) => {
      // Підхід збережено — кладемо його в кеш активного тренування одразу,
      // без рефетчу. Перевірка на дубль — бо повтор після загубленої
      // відповіді теж закінчується успіхом
      queryClient.setQueryData(activeWorkoutQueryOptions.queryKey, (workout) =>
        workout && !workout.sets.some((set) => set.id === body.id)
          ? {
              ...workout,
              sets: [
                ...workout.sets,
                {
                  id: body.id,
                  exerciseId: body.exerciseId,
                  plannedExerciseId: body.plannedExerciseId ?? null,
                  weight: body.weight,
                  reps: body.reps,
                  performedAt: body.performedAt,
                },
              ],
            }
          : workout,
      );
    },
  });
}

export type UnsavedSet = CreateWorkoutSetBody & {
  status: "saving" | "failed";
};

// Підходи, які юзер уже зробив, але сервер ще не підтвердив. Збережені
// беруться з useActiveWorkoutQuery, ці — прямо зі стану мутацій: так
// «оптимістична» плитка зʼявляється одразу, і не треба вручну вписувати
// її в кеш запиту, а потім відкочувати при помилці.
//
// Одна й та сама плитка може мати кілька мутацій (невдала спроба + повтор),
// тож за id лишаємо лише останню
export function useUnsavedSets(workoutId: string): UnsavedSet[] {
  const mutations = useMutationState({
    filters: { mutationKey: addSetMutationKey(workoutId) },
    select: (mutation) => ({
      body: mutation.state.variables as CreateWorkoutSetBody | undefined,
      status: mutation.state.status,
    }),
  });

  const latestById = new Map<string, (typeof mutations)[number]>();
  for (const mutation of mutations) {
    if (mutation.body) latestById.set(mutation.body.id, mutation);
  }

  return [...latestById.values()].flatMap(({ body, status }) =>
    body && (status === "pending" || status === "error")
      ? [{ ...body, status: status === "pending" ? "saving" : "failed" }]
      : [],
  );
}
