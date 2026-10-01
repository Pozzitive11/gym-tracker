import type { ReactNode } from "react";
import { SetTiles, type SetTile } from "./SetTiles";

// Пропозиція контракту: поточна вправа, розгорнута в панель. Панель не знає,
// що всередині степерів і чи йде відпочинок — це слоти (children/action),
// які збирає сторінка. Так панель лишається чистою розміткою.
interface ExercisePanelProps {
  name: string;
  replacedName?: string; // якщо вправу замінили: що саме замінили
  setNumber: number;
  setCount: number;
  targetReps: string; // «8 повторень» — множину вирішує той, хто знає число
  tiles: SetTile[];
  children: ReactNode; // два StepperDial: вага й повтори
  action: ReactNode; // кнопка «Підхід зроблено» або RestTimer
  onSwap?: () => void; // нема — посилання «Замінити вправу» не показується
  onRetrySet?: (index: number) => void; // нове: повтор незбереженого підходу
}

export function ExercisePanel({
  name,
  replacedName,
  setNumber,
  setCount,
  targetReps,
  tiles,
  children,
  action,
  onSwap,
  onRetrySet,
}: ExercisePanelProps) {
  return (
    <section className="mt-1.5 mb-2.5 rounded-panel bg-surface p-5">
      <h2 className="font-display text-[20px] leading-tight font-bold tracking-title">
        {name}
      </h2>
      {replacedName && (
        <p className="mt-1.5 text-tag font-semibold tracking-[.06em] text-warn uppercase">
          замість: {replacedName}
        </p>
      )}
      <p className="mt-1.5 text-label text-dim tabular-nums">
        Підхід {setNumber} з {setCount} · ціль {targetReps}
      </p>

      {children}
      {action}

      <SetTiles tiles={tiles} onRetry={onRetrySet} />

      {onSwap && (
        <button
          onClick={onSwap}
          className="mt-3.5 w-full p-2.5 text-label font-medium text-dim transition-colors hover:text-text active:text-text"
        >
          Замінити вправу
        </button>
      )}
    </section>
  );
}

// Головна кнопка екрана. Окремо від панелі, бо на її місці іноді стоїть
// таймер відпочинку — і вирішує це стан, а не панель.
export function CommitSetButton({
  onClick,
  disabled = false,
  secondary = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  // Пропозиція контракту (нове): усі вправи закриті, головна дія тепер
  // «Завершити тренування» — кнопка підходу стає другорядною
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mt-5 w-full rounded-[20px] font-display font-extrabold transition-[transform,opacity] duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-40 ${
        secondary
          ? "h-14 bg-surface-2 text-label text-text"
          : "h-[72px] bg-accent text-lead text-accent-ink"
      }`}
    >
      {secondary ? "Ще один підхід" : "Підхід зроблено"}
    </button>
  );
}
