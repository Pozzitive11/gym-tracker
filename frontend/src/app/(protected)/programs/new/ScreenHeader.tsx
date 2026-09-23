import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
}

export function ScreenHeader({ title, subtitle, backHref }: ScreenHeaderProps) {
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
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-label text-dim tabular-nums">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
