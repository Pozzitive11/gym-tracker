// Пропозиція контракту: число з двома степерами по боках. Вага й повтори —
// той самий компонент у двох розмірах. decLabel/incLabel — підписи на
// кнопках («−2.5», «+1»), бо крок ваги в кожної вправи свій.
// onValueChange (нове): якщо переданий, число стає полем вводу — тап по ньому
// відкриває клавіатуру. Приходить сирий рядок як є («82,5», «»): розбір і
// перевірка — на стороні стану, не розмітки.
interface StepperDialProps {
  value: string;
  onValueChange?: (raw: string) => void;
  inputMode?: "decimal" | "numeric";
  inputAriaLabel?: string;
  unit: string;
  decLabel: string;
  incLabel: string;
  decAriaLabel: string;
  incAriaLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  size?: "lg" | "sm";
}

export function StepperDial({
  value,
  onValueChange,
  inputMode = "decimal",
  inputAriaLabel,
  unit,
  decLabel,
  incLabel,
  decAriaLabel,
  incAriaLabel,
  onDecrement,
  onIncrement,
  size = "lg",
}: StepperDialProps) {
  const stepClass = `flex-none rounded-[20px] bg-surface-2 font-display font-bold text-text tabular-nums transition-[transform,background-color] duration-[120ms] ease-out active:scale-[.93] active:bg-surface-3 pointer-fine:hover:bg-surface-3 ${
    size === "lg"
      ? "h-[74px] w-[74px] text-[14px]"
      : "h-[60px] w-[60px] text-label"
  }`;

  const numberClass = `font-display font-extrabold tracking-dial tabular-nums ${
    size === "lg" ? "text-dial" : "text-dial-sm"
  }`;

  return (
    <div className="mt-5 flex items-center justify-between gap-2.5">
      <button
        onClick={onDecrement}
        aria-label={decAriaLabel}
        className={stepClass}
      >
        {decLabel}
      </button>
      <span className="min-w-0 flex-1 text-center">
        {onValueChange ? (
          // type="text" + inputMode, а не type="number": клавіатура та сама
          // цифрова, але поле не ламається на «82,5» з комою і не крутить
          // значення колесом миші. У фокусі поле підсвічується тлом.
          <input
            type="text"
            inputMode={inputMode}
            enterKeyHint="done"
            autoComplete="off"
            aria-label={inputAriaLabel}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onFocus={(event) => event.target.select()}
            className={`${numberClass} w-full rounded-control bg-transparent text-center text-text caret-accent outline-none focus:bg-surface-2`}
          />
        ) : (
          <span className={`block ${numberClass}`}>{value}</span>
        )}
        <span className="mt-1.5 block text-tag font-semibold tracking-label text-dim uppercase">
          {unit}
        </span>
      </span>
      <button
        onClick={onIncrement}
        aria-label={incAriaLabel}
        className={stepClass}
      >
        {incLabel}
      </button>
    </div>
  );
}
