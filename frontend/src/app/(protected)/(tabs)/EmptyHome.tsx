import { Dumbbell } from "lucide-react";
import Link from "next/link";

const STEPS = [
  "Додай дні й вправи",
  "Виріши, скільки підходів і повторів",
  "Тренуйся — вага й повтори підставляться самі",
];

export function EmptyHome() {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 pb-16">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-panel bg-surface text-accent">
        <Dumbbell size={30} strokeWidth={1.8} />
      </div>

      <h2 className="mb-3 font-display text-[27px] leading-tight font-extrabold tracking-display">
        Тут поки порожньо
      </h2>
      <p className="mb-7 max-w-[30ch] text-body leading-relaxed text-dim">
        Склади програму вдома, і в залі залишиться тільки тиснути кнопки. Це
        займе кілька хвилин.
      </p>

      <div className="mb-7 flex flex-col gap-3 rounded-panel bg-surface p-4">
        {STEPS.map((text, i) => (
          <div key={text} className="flex items-center gap-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-control bg-surface-2 text-label font-semibold text-dim tabular-nums">
              {i + 1}
            </div>
            <p className="text-label text-text">{text}</p>
          </div>
        ))}
      </div>

      <Link
        href="/programs/new"
        className="grid h-[66px] w-full place-items-center rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975]"
      >
        Створити програму
      </Link>
    </div>
  );
}
