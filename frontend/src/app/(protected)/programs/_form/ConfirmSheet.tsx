"use client";

import { useEffect } from "react";

// Пропозиція контракту: шторка підтвердження незворотної дії. Стан «відкрита»
// тримає батько (це він знає, що саме підтверджуємо); pending блокує кнопки,
// поки запит у дорозі, error показується над ними.
interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string | null;
}

export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
  error,
}: ConfirmSheetProps) {
  // Escape закриває, як будь-який діалог — але не посеред запиту
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  // Шторка змонтована завжди, щоб і поява, і зникання мали анімацію.
  // Закрита — inert: її кнопки не ловлять ні фокус, ні тапи.
  // absolute, а не fixed: позиціюється від оболонки застосунку (relative
  // + overflow-clip у кореневому layout), тож на десктопі лишається в рамці
  return (
    <div
      className={`absolute inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      inert={!open}
    >
      <div
        onClick={pending ? undefined : onCancel}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        className={`absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface px-5 pt-[22px] pb-[calc(env(safe-area-inset-bottom)+22px)] transition-transform duration-[340ms] ease-drawer motion-reduce:transition-none ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <h3
          id="confirm-sheet-title"
          className="font-display text-[18px] font-bold tracking-title"
        >
          {title}
        </h3>
        <p className="mt-1.5 text-label leading-relaxed text-dim">
          {description}
        </p>

        {error && (
          <div className="mt-4 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="mt-5 h-[60px] w-full rounded-card bg-danger font-display text-lead font-bold text-bg transition-transform duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? "Видаляємо…" : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="mt-2 h-[56px] w-full rounded-card text-body font-semibold text-dim transition-colors hover:text-text active:text-text disabled:opacity-50"
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}
