import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SwappedExercise {
  exerciseId: string;
  name: string;
}

interface WorkoutState {
  // Якому тренуванню належить стан. Стор живе в localStorage і переживає
  // не лише перезавантаження, а й кинуте тренування: без цього поля заміни
  // й таймер з минулого разу просочились би в нове тренування
  workoutId: string | null;
  currentExerciseIndex: number;
  // Ключ — індекс вправи в плані дня. Нема ключа — заміни не було
  swappedExercises: Record<number, SwappedExercise>;
  restEndsAt: number | null;
  restTotalSeconds: number | null;

  // Викликати, коли відкрито тренування: якщо стан належить іншому
  // тренуванню (або порожній) — починаємо з чистого
  bindWorkout: (workoutId: string) => void;
  selectExercise: (index: number) => void;
  swapExercise: (index: number, exercise: SwappedExercise) => void;
  // Повернути вправу за планом: ключ просто зникає
  unswapExercise: (index: number) => void;
  startRest: (seconds: number) => void;
  skipRest: () => void;
  reset: () => void;
}

// Один початковий стан на створення стору й на reset: додане поле не
// забудеться в одному з двох місць
const initialState = {
  workoutId: null,
  currentExerciseIndex: 0,
  swappedExercises: {},
  restEndsAt: null,
  restTotalSeconds: null,
} satisfies Partial<WorkoutState>;

// Подвійні дужки create<T>()(...) — вимога Zustand для middleware: інакше
// TypeScript не виведе типи через persist
export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      ...initialState,

      bindWorkout: (workoutId) =>
        set((state) =>
          state.workoutId === workoutId
            ? state
            : { ...initialState, workoutId },
        ),

      selectExercise: (index) => set({ currentExerciseIndex: index }),

      swapExercise: (index, exercise) =>
        set((state) => ({
          swappedExercises: { ...state.swappedExercises, [index]: exercise },
        })),

      unswapExercise: (index) =>
        set((state) => {
          // Копія, а не delete на самому стані: Zustand порівнює посилання,
          // і зміна старого об'єкта на місці не перемалювала б екран
          const swappedExercises = { ...state.swappedExercises };
          delete swappedExercises[index];
          return { swappedExercises };
        }),

      startRest: (seconds) =>
        set({
          restEndsAt: Date.now() + seconds * 1000,
          restTotalSeconds: seconds,
        }),

      skipRest: () => set({ restEndsAt: null, restTotalSeconds: null }),

      reset: () => set(initialState),
    }),
    // Ключ у localStorage. Map тут не підійшов би: persist пише через
    // JSON.stringify, а Map серіалізується в {} і мовчки губить дані
    { name: "workout" },
  ),
);
