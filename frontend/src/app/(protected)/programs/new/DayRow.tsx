import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface DayRowProps {
  href: string;
  letter: string;
  title: string;
  subtitle: string;
  warn?: boolean;
}

export function DayRow({ href, letter, title, subtitle, warn }: DayRowProps) {
  return (
    <Link
      href={href}
      className="mb-2 flex w-full items-center gap-3 rounded-card bg-surface px-4 py-3.5 transition-transform duration-150 ease-out active:scale-[.985]"
    >
      <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-chip bg-surface-2 font-display text-label font-bold text-accent">
        {letter}
      </span>
      <span className="min-w-0">
        <span className="block text-body font-medium">{title}</span>
        <span
          className={`mt-1 block text-meta ${warn ? "text-warn" : "text-dim"}`}
        >
          {subtitle}
        </span>
      </span>
      <ChevronRight size={18} className="ml-auto flex-none text-dim-2" />
    </Link>
  );
}
