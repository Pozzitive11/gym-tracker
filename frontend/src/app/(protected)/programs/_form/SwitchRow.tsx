interface SwitchRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchRow({
  title,
  description,
  checked,
  onChange,
}: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3.5 rounded-field bg-surface p-4 text-left transition-colors duration-150 hover:bg-surface-2 motion-reduce:transition-none"
    >
      <span>
        <span className="block text-body font-medium">{title}</span>
        <span className="mt-1 block text-meta leading-normal text-dim">
          {description}
        </span>
      </span>
      <span
        className={`relative ml-auto h-8 w-[52px] flex-none rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none ${
          checked ? "bg-accent" : "bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full transition-[transform,background-color] duration-200 ease-out motion-reduce:transition-none ${
            checked ? "translate-x-5 bg-accent-ink" : "bg-dim"
          }`}
        />
      </span>
    </button>
  );
}
