// Пропозиція контракту: по сегменту на вправу, у порядку списку.
interface WorkoutProgressProps {
  segments: { isDone: boolean; isCurrent: boolean }[];
}

export function WorkoutProgress({ segments }: WorkoutProgressProps) {
  return (
    <div className="flex flex-none gap-1 px-5 pb-3.5" aria-hidden>
      {segments.map((segment, index) => (
        <i
          key={index}
          className={`h-[3px] flex-1 rounded-full transition-colors duration-200 ease-out ${
            segment.isCurrent
              ? "bg-accent"
              : segment.isDone
                ? "bg-dim-2"
                : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}
