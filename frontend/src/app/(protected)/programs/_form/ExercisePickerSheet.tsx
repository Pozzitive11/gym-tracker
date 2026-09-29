"use client";

import { Check, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiErrorText } from "@/lib/api/unwrap";
import {
  useCreateExerciseMutation,
  useExercisesQuery,
  type Exercise,
} from "@/lib/api/exercises";
import { newId } from "@/lib/id";

// Пропозиція контракту: шторка вибору вправи з каталогу. Відкрита чи ні —
// вирішує батько (він знає, куди піде обрана вправа: новий рядок чи заміна
// наявного). Каталог і створення своєї вправи шторка бере сама.
interface ExercisePickerSheetProps {
  open: boolean;
  selectedId?: string;
  onPick: (exercise: Pick<Exercise, "id" | "name">) => void;
  onClose: () => void;
}

export function ExercisePickerSheet({
  open,
  selectedId,
  onPick,
  onClose,
}: ExercisePickerSheetProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: exercises, isPending, isError, refetch } = useExercisesQuery();
  const createExercise = useCreateExerciseMutation();

  // Пошук скидаємо в момент закриття, а не в ефекті на відкриття: так
  // наступне відкриття одразу чисте, без кадру зі старим текстом
  const close = () => {
    setQuery("");
    createExercise.reset();
    onClose();
  };
  const pick = (exercise: Pick<Exercise, "id" | "name">) => {
    setQuery("");
    createExercise.reset();
    onPick(exercise);
  };

  // Фокус у пошук після кадру: поки шторка inert, фокус у неї не ставиться
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Escape закриває, як будь-який діалог. Обробник у ref, щоб ефект не
  // перепідписувався на кожен рендер через нову функцію close
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trimmed = query.trim();
  const needle = trimmed.toLocaleLowerCase("uk");
  const matches = (exercises ?? []).filter((exercise) =>
    exercise.name.toLocaleLowerCase("uk").includes(needle),
  );
  const hasExactMatch = matches.some(
    (exercise) => exercise.name.toLocaleLowerCase("uk") === needle,
  );

  const createMine = () => {
    createExercise.mutate(
      { id: newId(), name: trimmed },
      // сервер міг знайти наявну вправу з такою назвою — беремо його id
      { onSuccess: (exercise) => pick(exercise) },
    );
  };

  return (
    <div
      className={`absolute inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      inert={!open}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-picker-title"
        className={`absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-sheet bg-surface pt-[22px] transition-transform duration-[340ms] ease-drawer motion-reduce:transition-none ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex-none px-5">
          <h3
            id="exercise-picker-title"
            className="font-display text-[18px] font-bold tracking-title"
          >
            Вправа
          </h3>
          <label className="relative mt-4 block">
            <Search
              size={18}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-dim-2"
            />
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Пошук або своя назва"
              aria-label="Пошук вправи"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-[52px] w-full rounded-field bg-surface-2 pr-4 pl-11 text-[16px] text-text outline-none placeholder:text-dim-2 focus:inset-ring-2 focus:inset-ring-accent"
            />
          </label>
        </div>

        <div className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {trimmed && !hasExactMatch && (
            <button
              type="button"
              onClick={createMine}
              disabled={createExercise.isPending}
              className="mb-1 flex min-h-[52px] w-full items-center gap-3 rounded-field px-3 py-3 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[.985] disabled:opacity-50 pointer-fine:hover:bg-surface-2"
            >
              <span className="grid h-8 w-8 flex-none place-items-center rounded-control bg-accent/15 text-accent">
                <Plus size={16} strokeWidth={2.4} />
              </span>
              <span className="min-w-0 text-body">
                {createExercise.isPending ? "Додаємо…" : "Додати свою: "}
                {!createExercise.isPending && (
                  <span className="font-semibold">«{trimmed}»</span>
                )}
              </span>
            </button>
          )}
          {createExercise.isError && (
            <p className="mx-3 mb-2 text-meta text-warn">
              {apiErrorText(createExercise.error)}
            </p>
          )}

          {isPending && (
            <p className="px-3 py-6 text-body text-dim">Завантаження…</p>
          )}

          {isError && (
            <div className="px-3 py-6">
              <p className="text-body text-dim">
                Не вдалося завантажити вправи.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 h-11 rounded-card bg-surface-2 px-5 text-label font-semibold transition-transform duration-150 ease-out active:scale-[.975]"
              >
                Спробувати ще раз
              </button>
            </div>
          )}

          {exercises && matches.length === 0 && !trimmed && (
            <p className="px-3 py-6 text-body text-dim">Каталог порожній.</p>
          )}

          <ul>
            {matches.map((exercise) => {
              const selected = exercise.id === selectedId;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => pick(exercise)}
                    aria-current={selected || undefined}
                    className="flex min-h-[52px] w-full items-center gap-2 rounded-field px-3 py-3 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[.985] pointer-fine:hover:bg-surface-2"
                  >
                    <span
                      className={`min-w-0 truncate text-body ${selected ? "font-semibold text-accent" : "text-text"}`}
                    >
                      {exercise.name}
                    </span>
                    {exercise.isMine && (
                      <span className="flex-none rounded-[6px] bg-accent/15 px-[7px] py-[3px] text-[9.5px] font-bold tracking-[.1em] text-accent uppercase">
                        моя
                      </span>
                    )}
                    {selected && (
                      <Check
                        size={18}
                        strokeWidth={2.2}
                        className="ml-auto flex-none text-accent"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
