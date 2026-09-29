// Пропозиція контракту: таймер лише показує. Скільки лишилось і коли він
// скінчився — рахує стан тренування й перемальовує компонент.
interface RestTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  onSkip: () => void;
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RestTimer({
  secondsLeft,
  totalSeconds,
  onSkip,
}: RestTimerProps) {
  const ratio = totalSeconds > 0 ? Math.max(0, secondsLeft / totalSeconds) : 0;

  return (
    <div
      role="timer"
      className="relative mt-5 flex h-[72px] items-center gap-3.5 overflow-hidden rounded-[20px] bg-surface-2 px-5"
    >
      {/* Смуга, що тане зліва направо. scaleX замість width — анімується
          на GPU без перерахунку розкладки. */}
      <span
        className="absolute inset-0 origin-left bg-accent/15 transition-transform duration-1000 ease-linear motion-reduce:transition-none"
        style={{ transform: `scaleX(${ratio})` }}
      />
      <span className="relative text-tag font-semibold tracking-label text-dim uppercase">
        Відпочинок
      </span>
      <span className="relative font-display text-[26px] font-bold text-accent tabular-nums">
        {formatClock(secondsLeft)}
      </span>
      <button
        onClick={onSkip}
        className="relative ml-auto py-2.5 text-label font-semibold text-dim transition-colors hover:text-text active:text-text"
      >
        Пропустити
      </button>
    </div>
  );
}
