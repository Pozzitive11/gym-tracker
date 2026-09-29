// Пропозиція контракту: згорнута вправа в списку. meta — готовий рядок
// праворуч («3×10 · 30 кг» або «3 / 3» для закритої), бо що саме там
// показувати — рішення стану, а не розмітки.
interface ExerciseRowProps {
  name: string;
  meta: string;
  isDone: boolean;
  onSelect: () => void;
}

export function ExerciseRow({
  name,
  meta,
  isDone,
  onSelect,
}: ExerciseRowProps) {
  return (
    <button
      onClick={onSelect}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-field px-4 py-[15px] text-left transition-[background-color,transform] duration-150 ease-out active:scale-[.985] pointer-fine:hover:bg-surface"
    >
      <span
        className={`min-w-0 truncate text-body font-medium ${isDone ? "text-dim-2" : "text-text"}`}
      >
        {name}
      </span>
      <span
        className={`ml-auto flex-none text-meta tabular-nums ${isDone ? "text-accent" : "text-dim"}`}
      >
        {meta}
      </span>
    </button>
  );
}
