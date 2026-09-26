import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { pluralizeUk } from "@/lib/pluralize";

// Пропозиція контракту: href — куди веде тап (екран редагування програми)
interface ProgramListItemProps {
  href: string;
  name: string;
  dayCount: number;
  exerciseCount: number;
  isActive: boolean;
}

export function ProgramListItem({
  href,
  name,
  dayCount,
  exerciseCount,
  isActive,
}: ProgramListItemProps) {
  return (
    <Link
      href={href}
      className={`mb-2 flex items-center gap-3.5 rounded-card px-4 py-4 transition-[background-color,transform] duration-150 ease-out active:scale-[.985] ${
        isActive
          ? "bg-surface hover:bg-surface-2"
          : "inset-ring-1 inset-ring-line hover:bg-surface"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-label font-semibold">{name}</p>
        <p className="mt-0.5 text-meta text-dim tabular-nums">
          {dayCount} {pluralizeUk(dayCount, ["день", "дні", "днів"])} ·{" "}
          {exerciseCount}{" "}
          {pluralizeUk(exerciseCount, ["вправа", "вправи", "вправ"])}
        </p>
      </div>
      <span className="ml-auto flex flex-none items-center gap-2">
        {isActive && (
          <span className="rounded-chip bg-accent px-2.5 py-1 text-micro font-semibold tracking-label text-accent-ink uppercase">
            активна
          </span>
        )}
        <ChevronRight size={18} className="text-dim-2" />
      </span>
    </Link>
  );
}
