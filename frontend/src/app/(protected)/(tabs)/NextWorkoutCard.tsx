interface NextWorkoutCardProps {
  dayName: string;
  exercises: string[];
  onStart: () => void;
}

export function NextWorkoutCard({
  dayName,
  exercises,
  onStart,
}: NextWorkoutCardProps) {
  return (
    <div className="mx-5 mt-1 rounded-panel bg-surface px-5 pt-[22px] pb-5">
      <p className="text-tag font-semibold tracking-kicker text-accent uppercase">
        Наступне за планом
      </p>
      <p className="mt-2.5 mb-3 font-display text-[34px] font-extrabold tracking-display">
        {dayName}
      </p>
      <p className="mb-5 text-meta leading-relaxed text-dim">
        {exercises.join(", ")}
      </p>
      <button
        onClick={onStart}
        className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975]"
      >
        Почати тренування
      </button>
    </div>
  );
}
