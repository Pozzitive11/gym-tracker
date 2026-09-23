import { pluralizeUk } from "@/lib/pluralize";

interface ProgramListItemProps {
  name: string;
  dayCount: number;
  exerciseCount: number;
  isActive: boolean;
}

export function ProgramListItem({
  name,
  dayCount,
  exerciseCount,
  isActive,
}: ProgramListItemProps) {
  return (
    <div
      className={`mb-2 flex items-center gap-3.5 rounded-card px-4 py-4 ${
        isActive ? "bg-surface" : "inset-ring-1 inset-ring-line"
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
      {isActive && (
        <span className="ml-auto flex-none rounded-chip bg-accent px-2.5 py-1 text-micro font-semibold tracking-label text-accent-ink uppercase">
          активна
        </span>
      )}
    </div>
  );
}
