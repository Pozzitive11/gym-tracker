import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// Пропозиція контракту: elapsed — уже відформатований рядок («25:26»),
// бо звідки брати час і як часто його оновлювати, вирішує стан тренування.
interface WorkoutHeaderProps {
  dayName: string;
  elapsed: string;
  backHref: string;
  onFinish: () => void;
}

export function WorkoutHeader({
  dayName,
  elapsed,
  backHref,
  onFinish,
}: WorkoutHeaderProps) {
  return (
    <header className="flex flex-none items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-3">
      <Link
        href={backHref}
        aria-label="Назад"
        className="grid h-10 w-10 flex-none place-items-center rounded-control bg-surface text-text transition-transform duration-150 ease-out active:scale-[.94]"
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate font-display text-[19px] font-bold tracking-title">
          {dayName}
        </h1>
        <p className="text-label text-dim tabular-nums">{elapsed}</p>
      </div>
      <button
        onClick={onFinish}
        className="ml-auto px-1 py-2 text-[14px] font-medium text-dim transition-[color,transform] duration-150 ease-out hover:text-text active:scale-[.96] active:text-text"
      >
        Завершити
      </button>
    </header>
  );
}
