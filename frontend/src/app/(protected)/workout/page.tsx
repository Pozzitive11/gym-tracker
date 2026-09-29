"use client";

import { CommitSetButton, ExercisePanel } from "./ExercisePanel";
import { ExerciseRow } from "./ExerciseRow";
import { StepperDial } from "./StepperDial";
import { WorkoutHeader } from "./WorkoutHeader";
import { WorkoutProgress } from "./WorkoutProgress";

// ЗАГЛУШКА ДЛЯ ВЕРСТКИ. Статичні дані з макета, щоб екран було видно.
// Стан тренування, обробники й дані з бекенду сюди пише Влад — після цього
// DEMO і noop зникають повністю.
const DEMO = {
  dayName: "День A",
  elapsed: "25:26",
  current: {
    name: "Жим лежачи",
    setNumber: 2,
    setCount: 4,
    targetReps: "8 повторень",
    weight: "82.5",
    reps: "8",
    step: "2.5",
    tiles: [{ label: "82.5×8", isHit: true }, null, null, null],
  },
  rest: [
    { name: "Жим гантелей під кутом", meta: "3×10 · 30 кг" },
    { name: "Розводка в кросовері", meta: "3×12 · 17.5 кг" },
    { name: "Жим стоячи", meta: "4×6 · 47.5 кг" },
    { name: "Махи в сторони", meta: "3×15 · 12 кг" },
    { name: "Французький жим", meta: "3×10 · 27.5 кг" },
  ],
};

const noop = () => {};

export default function WorkoutPage() {
  const { current } = DEMO;

  return (
    <div className="flex h-full flex-col">
      <WorkoutHeader
        dayName={DEMO.dayName}
        elapsed={DEMO.elapsed}
        backHref="/"
        onFinish={noop}
      />
      <WorkoutProgress
        segments={[
          { isDone: false, isCurrent: true },
          ...DEMO.rest.map(() => ({ isDone: false, isCurrent: false })),
        ]}
      />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <ExercisePanel
          name={current.name}
          setNumber={current.setNumber}
          setCount={current.setCount}
          targetReps={current.targetReps}
          tiles={current.tiles}
          action={<CommitSetButton onClick={noop} />}
          onSwap={noop}
        >
          <StepperDial
            value={current.weight}
            unit="кг"
            decLabel={`−${current.step}`}
            incLabel={`+${current.step}`}
            decAriaLabel="Менше ваги"
            incAriaLabel="Більше ваги"
            onDecrement={noop}
            onIncrement={noop}
          />
          <StepperDial
            size="sm"
            value={current.reps}
            unit="повторень"
            decLabel="−1"
            incLabel="+1"
            decAriaLabel="Менше повторень"
            incAriaLabel="Більше повторень"
            onDecrement={noop}
            onIncrement={noop}
          />
        </ExercisePanel>

        {DEMO.rest.map((exercise) => (
          <ExerciseRow
            key={exercise.name}
            name={exercise.name}
            meta={exercise.meta}
            isDone={false}
            onSelect={noop}
          />
        ))}
      </div>
    </div>
  );
}
