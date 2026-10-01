import type { ActiveWorkout, UnsavedSet } from "@/lib/api/workouts";
import type { SwappedExercise } from "./workout-store";

export interface SlotSet {
  id: string;
  weight: number;
  reps: number;
  performedAt: string;
  // Нема — збережено на сервері. Для незбереженого тут і лежить тіло для
  // повтору: ті самі змінні, той самий id
  unsaved?: UnsavedSet;
}

// Одна вправа плану дня такою, як її бачить екран тренування
export interface WorkoutSlot {
  index: number;
  planned: { exerciseId: string; name: string };
  // Що робимо насправді: заміна зі стору, інакше — вправа з плану
  actual: { exerciseId: string; name: string };
  isSwapped: boolean;
  targetSets: number;
  targetReps: number;
  // Останній підхід цієї вправи в минулих тренуваннях; null — ще не робив
  lastWeight: number | null;
  lastReps: number | null;
  sets: SlotSet[];
  isDone: boolean;
}

// Чиста функція: план + збережені підходи + незбережені + заміни → список
// вправ для екрана. Без React і без мережі, тож її легко перевірити тестом.
//
// Підхід належить вправі плану за plannedExerciseId (якщо була заміна) або
// за exerciseId. Обмеження: якщо та сама вправа стоїть у дні двічі, усі її
// підходи потраплять у перший слот — для нашого плану прийнятно
export function buildSlots(
  workout: ActiveWorkout,
  unsaved: UnsavedSet[],
  swapped: Record<number, SwappedExercise>,
): WorkoutSlot[] {
  // Кожен підхід разом із ключем вправи плану, до якої він належить
  const keyed: { key: string; set: SlotSet }[] = [
    ...workout.sets.map((set) => ({
      key: set.plannedExerciseId ?? set.exerciseId,
      set: {
        id: set.id,
        weight: set.weight,
        reps: set.reps,
        performedAt: set.performedAt,
      },
    })),
    ...unsaved.map((set) => ({
      key: set.plannedExerciseId ?? set.exerciseId,
      set: {
        id: set.id,
        weight: set.weight,
        reps: set.reps,
        performedAt: set.performedAt,
        unsaved: set,
      },
    })),
  ].sort((a, b) => a.set.performedAt.localeCompare(b.set.performedAt));

  const taken = new Set<string>();

  return workout.exercises.map((planned, index) => {
    const swap = swapped[index];
    const sets = taken.has(planned.exerciseId)
      ? []
      : keyed
          .filter((entry) => entry.key === planned.exerciseId)
          .map((entry) => entry.set);
    taken.add(planned.exerciseId);

    return {
      index,
      planned: { exerciseId: planned.exerciseId, name: planned.name },
      actual: swap ?? { exerciseId: planned.exerciseId, name: planned.name },
      isSwapped: swap !== undefined,
      targetSets: planned.targetSets,
      targetReps: planned.targetReps,
      lastWeight: planned.lastWeight,
      lastReps: planned.lastReps,
      sets,
      isDone: sets.length >= planned.targetSets,
    };
  });
}

// Наступна незакрита вправа після index, по колу. null — закрито все
export function nextOpenSlot(slots: WorkoutSlot[], index: number) {
  for (let step = 1; step <= slots.length; step++) {
    const slot = slots[(index + step) % slots.length];
    if (!slot.isDone) return slot.index;
  }
  return null;
}

// «82,5» → 82.5. null — не число або поза межами, які приймає сервер
export function parseWeight(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 9999.99) return null;
  // сервер приймає максимум два знаки після коми
  return Math.round(value * 100) / 100;
}

export const formatWeight = (weight: number) => String(weight);
