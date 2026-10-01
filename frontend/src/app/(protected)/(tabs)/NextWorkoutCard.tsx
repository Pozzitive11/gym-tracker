// Пропозиція контракту (нове): kicker і actionLabel — щоб та сама картка
// показувала і «наступне за планом», і незавершене тренування;
// pending блокує кнопку, поки тренування створюється; error — під кнопкою
interface NextWorkoutCardProps {
  dayName: string;
  exercises: string[];
  onStart: () => void;
  kicker?: string;
  actionLabel?: string;
  pending?: boolean;
  error?: string | null;
}

export function NextWorkoutCard({
  dayName,
  exercises,
  onStart,
  kicker = "Наступне за планом",
  actionLabel = "Почати тренування",
  pending = false,
  error,
}: NextWorkoutCardProps) {
  return (
    <div className="mx-5 mt-1 rounded-panel bg-surface px-5 pt-[22px] pb-5">
      <p className="text-tag font-semibold tracking-kicker text-accent uppercase">
        {kicker}
      </p>
      <p className="mt-2.5 mb-3 font-display text-[34px] font-extrabold tracking-display">
        {dayName}
      </p>
      <p className="mb-5 text-meta leading-relaxed text-dim">
        {exercises.join(", ")}
      </p>
      <button
        onClick={onStart}
        disabled={pending}
        className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-[transform,opacity] duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? "Починаємо…" : actionLabel}
      </button>
      {error && <p className="mt-3 text-meta text-warn">{error}</p>}
    </div>
  );
}
