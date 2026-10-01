"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiErrorText } from "@/lib/api/unwrap";
import {
  useActiveWorkoutQuery,
  useAddSetMutation,
  useFinishWorkoutMutation,
  useUnsavedSets,
  type ActiveWorkout,
} from "@/lib/api/workouts";
import { newId } from "@/lib/id";
import { pluralizeUk } from "@/lib/pluralize";
import {
  buildSlots,
  formatWeight,
  nextOpenSlot,
  parseWeight,
  type WorkoutSlot,
} from "@/lib/workout/build-slots";
import { useRestSecondsLeft } from "@/lib/workout/use-rest-seconds-left";
import { useWorkoutStore } from "@/lib/workout/workout-store";
import { CommitSetButton, ExercisePanel } from "./ExercisePanel";
import { ExerciseRow } from "./ExerciseRow";
import { RestTimer } from "./RestTimer";
import type { SetTile } from "./SetTiles";
import { StepperDial } from "./StepperDial";
import { WorkoutHeader } from "./WorkoutHeader";
import { WorkoutProgress } from "./WorkoutProgress";

// Відпочинок між підходами. Поки один на всіх: налаштування в програмі нема
const REST_SECONDS = 120;
// Крок ± для ваги. Точні значення (82.5, +0.5) — через поле вводу
const WEIGHT_STEP = 1;

export default function WorkoutPage() {
  const {
    data: workout,
    isPending,
    isError,
    refetch,
  } = useActiveWorkoutQuery();

  if (isPending) {
    return <Centered>Завантаження…</Centered>;
  }

  if (isError) {
    return (
      <Centered>
        Не вдалося завантажити тренування.
        <button
          onClick={() => refetch()}
          className="mt-4 h-12 rounded-card bg-surface px-6 text-label font-semibold text-text transition-transform duration-150 ease-out active:scale-[.975]"
        >
          Спробувати ще раз
        </button>
      </Centered>
    );
  }

  if (!workout) {
    return (
      <Centered>
        Зараз ти не тренуєшся.
        <Link
          href="/"
          className="mt-4 grid h-12 place-items-center rounded-card bg-surface px-6 text-label font-semibold text-text transition-transform duration-150 ease-out active:scale-[.975]"
        >
          На головну
        </Link>
      </Centered>
    );
  }

  return <ActiveWorkoutScreen workout={workout} />;
}

function ActiveWorkoutScreen({ workout }: { workout: ActiveWorkout }) {
  const router = useRouter();
  const unsaved = useUnsavedSets(workout.id);
  const addSet = useAddSetMutation(workout.id);
  const finish = useFinishWorkoutMutation();

  const storeWorkoutId = useWorkoutStore((state) => state.workoutId);
  const currentIndex = useWorkoutStore((state) => state.currentExerciseIndex);
  const swapped = useWorkoutStore((state) => state.swappedExercises);
  const restTotal = useWorkoutStore((state) => state.restTotalSeconds);
  const bindWorkout = useWorkoutStore((state) => state.bindWorkout);
  const selectExercise = useWorkoutStore((state) => state.selectExercise);
  const startRest = useWorkoutStore((state) => state.startRest);
  const skipRest = useWorkoutStore((state) => state.skipRest);
  const reset = useWorkoutStore((state) => state.reset);

  const secondsLeft = useRestSecondsLeft();
  const elapsed = useElapsed(workout.startedAt);

  // Стор належить тренуванню: відкрили інше — він скидається (див. стор)
  useEffect(() => {
    bindWorkout(workout.id);
  }, [bindWorkout, workout.id]);

  // До першого bindWorkout у сторі можуть лежати дані минулого тренування —
  // у цьому рендері просто їх не використовуємо
  const isBound = storeWorkoutId === workout.id;
  const slots = buildSlots(workout, unsaved, isBound ? swapped : {});
  const current = Math.min(isBound ? currentIndex : 0, slots.length - 1);
  const isResting = isBound && secondsLeft !== null && secondsLeft > 0;
  const allDone = slots.length > 0 && slots.every((slot) => slot.isDone);

  const onFinish = () =>
    finish.mutate(workout.id, {
      onSuccess: () => {
        reset();
        router.replace("/");
      },
    });

  const onCommit = (slot: WorkoutSlot, weight: number, reps: number) => {
    // Тіло разом з id — один раз, тут. Повтор піде з тими самими змінними
    addSet.mutate({
      id: newId(),
      exerciseId: slot.actual.exerciseId,
      plannedExerciseId: slot.isSwapped ? slot.planned.exerciseId : undefined,
      weight,
      reps,
      performedAt: new Date().toISOString(),
    });
    startRest(REST_SECONDS);

    // Закрили останній підхід вправи — одразу до наступної незакритої
    if (slot.sets.length + 1 >= slot.targetSets) {
      const next = nextOpenSlot(
        slots.map((s) => (s.index === slot.index ? { ...s, isDone: true } : s)),
        slot.index,
      );
      if (next !== null) selectExercise(next);
    }
  };

  const onRetry = (slot: WorkoutSlot, tileIndex: number) => {
    const body = slot.sets[tileIndex]?.unsaved;
    if (!body || body.status !== "failed") return;
    // Ті самі змінні, що й першого разу, — тож і той самий id
    const { id, exerciseId, plannedExerciseId, weight, reps, performedAt } =
      body;
    addSet.mutate({
      id,
      exerciseId,
      plannedExerciseId,
      weight,
      reps,
      performedAt,
    });
  };

  if (slots.length === 0) {
    // День програми видалили, поки тренування було відкрите
    return (
      <div className="flex h-full flex-col">
        <WorkoutHeader
          dayName={workout.dayName}
          elapsed={elapsed}
          backHref="/"
          onFinish={onFinish}
        />
        <Centered>Плану цього дня більше нема. Заверши тренування.</Centered>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WorkoutHeader
        dayName={workout.dayName}
        elapsed={elapsed}
        backHref="/"
        onFinish={onFinish}
      />
      <WorkoutProgress
        segments={slots.map((slot) => ({
          isDone: slot.isDone,
          isCurrent: slot.index === current,
        }))}
      />

      {finish.isError && (
        <p className="mx-5 mb-3 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
          {apiErrorText(finish.error)}
        </p>
      )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {slots.map((slot) =>
          slot.index === current ? (
            // key: інша вправа — інша панель, і поля ваги й повторів
            // беруть нове початкове значення, а не лишаються від попередньої
            <CurrentExercise
              key={slot.index}
              slot={slot}
              allDone={allDone}
              rest={
                isResting ? (
                  <RestTimer
                    secondsLeft={secondsLeft}
                    totalSeconds={restTotal ?? REST_SECONDS}
                    onSkip={skipRest}
                  />
                ) : null
              }
              onCommit={(weight, reps) => onCommit(slot, weight, reps)}
              onRetry={(tileIndex) => onRetry(slot, tileIndex)}
            />
          ) : (
            <ExerciseRow
              key={slot.index}
              name={slot.actual.name}
              meta={rowMeta(slot)}
              isDone={slot.isDone}
              onSelect={() => selectExercise(slot.index)}
            />
          ),
        )}
      </div>

      {allDone && (
        // Усе за планом зроблено — завершення стає головною дією екрана.
        // Липка панель знизу, як ActionBar у формі програми
        <div className="flex-none border-t border-line bg-bg/90 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] backdrop-blur-xl">
          <button
            onClick={onFinish}
            disabled={finish.isPending}
            className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-[transform,opacity] duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-50"
          >
            {finish.isPending ? "Завершуємо…" : "Завершити тренування"}
          </button>
        </div>
      )}
    </div>
  );
}

// Розгорнута вправа. Вага й повтори — локальний стан: потрібні лише тут і
// лише до «Підхід зроблено», втратити їх при перемиканні не шкода.
// Вага — рядок, як його набрав юзер («82,»); число виводиться при потребі
function CurrentExercise({
  slot,
  allDone,
  rest,
  onCommit,
  onRetry,
}: {
  slot: WorkoutSlot;
  allDone: boolean;
  rest: React.ReactNode;
  onCommit: (weight: number, reps: number) => void;
  onRetry: (tileIndex: number) => void;
}) {
  // Початкова вага: останній підхід цієї вправи сьогодні → останній з
  // минулих тренувань → 0 (вправа вперше; для вправ з власною вагою 0 і є
  // правильне значення). Повтори — сьогоднішні або ціль із програми
  const last = slot.sets.at(-1);
  const [weightRaw, setWeightRaw] = useState(() =>
    formatWeight(last?.weight ?? slot.lastWeight ?? 0),
  );
  const [reps, setReps] = useState(last?.reps ?? slot.targetReps);

  const weight = parseWeight(weightRaw);
  const stepWeight = (delta: number) =>
    setWeightRaw(formatWeight(Math.max(0, (weight ?? 0) + delta)));

  const tiles: SetTile[] = Array.from(
    { length: Math.max(slot.targetSets, slot.sets.length) },
    (_, i) => {
      const set = slot.sets[i];
      if (!set) return null;
      return {
        label: `${formatWeight(set.weight)}×${set.reps}`,
        isHit: set.reps >= slot.targetReps,
        status: set.unsaved?.status,
      };
    },
  );

  return (
    <ExercisePanel
      name={slot.actual.name}
      replacedName={slot.isSwapped ? slot.planned.name : undefined}
      setNumber={Math.min(slot.sets.length + 1, slot.targetSets)}
      setCount={slot.targetSets}
      targetReps={`${slot.targetReps} ${pluralizeUk(slot.targetReps, [
        "повторення",
        "повторення",
        "повторень",
      ])}`}
      tiles={tiles}
      onRetrySet={onRetry}
      action={
        rest ?? (
          <CommitSetButton
            secondary={allDone}
            disabled={weight === null}
            onClick={() => {
              if (weight !== null) onCommit(weight, reps);
            }}
          />
        )
      }
    >
      <StepperDial
        value={weightRaw}
        onValueChange={setWeightRaw}
        inputAriaLabel="Вага, кг"
        unit={weight === null ? "введи вагу, кг" : "кг"}
        decLabel={`−${WEIGHT_STEP}`}
        incLabel={`+${WEIGHT_STEP}`}
        decAriaLabel="Менше ваги"
        incAriaLabel="Більше ваги"
        onDecrement={() => stepWeight(-WEIGHT_STEP)}
        onIncrement={() => stepWeight(WEIGHT_STEP)}
      />
      <StepperDial
        size="sm"
        value={String(reps)}
        unit={pluralizeUk(reps, ["повторення", "повторення", "повторень"])}
        decLabel="−1"
        incLabel="+1"
        decAriaLabel="Менше повторень"
        incAriaLabel="Більше повторень"
        onDecrement={() => setReps((r) => Math.max(0, r - 1))}
        onIncrement={() => setReps((r) => r + 1)}
      />
    </ExercisePanel>
  );
}

// «3×10 · 30 кг» до закриття вправи, «3 / 3» після
function rowMeta(slot: WorkoutSlot) {
  if (slot.isDone) return `${slot.sets.length} / ${slot.targetSets}`;
  const weight = slot.sets.at(-1)?.weight ?? slot.lastWeight;
  const base = `${slot.targetSets}×${slot.targetReps}`;
  return weight !== null ? `${base} · ${formatWeight(weight)} кг` : base;
}

// Час від старту тренування: «25:26», після години — «1:05:12».
// Як і з відпочинком, рахується від моменту, а не тіками
function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const total = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
      <div className="flex flex-col items-center text-body text-dim">
        {children}
      </div>
    </div>
  );
}
