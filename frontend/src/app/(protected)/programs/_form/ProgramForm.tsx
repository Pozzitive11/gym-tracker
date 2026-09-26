"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { newId } from "@/lib/id";
import { pluralizeUk } from "@/lib/pluralize";
import { ActionBar } from "./ActionBar";
import { ConfirmSheet } from "./ConfirmSheet";
import { DayRow } from "./DayRow";
import { ScreenHeader } from "./ScreenHeader";
import { SwitchRow } from "./SwitchRow";
import {
  arrayErrorMessage,
  dayLabel,
  type ProgramFormValues,
} from "./program.schema";

const sectionLabel =
  "px-1 pt-[22px] pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase";

// Одна форма на створення й редагування. Режими відрізняються лише тим, з
// якими значеннями форму створив layout (FormProvider вище) і що робить
// onSave — усе це приходить ззовні
interface ProgramFormProps {
  // Корінь піддерева форми: "/programs/new" або `/programs/${id}/edit`
  basePath: string;
  backHref: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  // Кидає виняток при невдачі; текст для юзера приходить окремо в error
  onSave: (values: ProgramFormValues) => Promise<void>;
  error: string | null;
  // Лише на редагуванні: без onDelete кнопки видалення нема (створення).
  // Кидає виняток при невдачі — шторка лишається відкритою з deleteError
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  deleteError?: string | null;
}

export function ProgramForm({
  basePath,
  backHref,
  title,
  subtitle,
  submitLabel,
  onSave,
  error,
  onDelete,
  isDeleting = false,
  deleteError,
}: ProgramFormProps) {
  const router = useRouter();
  // Відкрита шторка підтвердження — стан вигляду
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormContext<ProgramFormValues>();
  const { fields, append } = useFieldArray({ control, name: "days" });
  // fields знають лише про дні, а кількість вправ змінюється в редакторі дня
  const days = useWatch({ control, name: "days" });

  // router.push виконується як транзиція й чекає відповіді сервера, а звичайне
  // оновлення стану (append) застосовується одразу — тож рядок нового дня
  // з'являвся раніше за перехід. В одній транзиції React тримає обидва
  // оновлення разом. isAddingDay вимикає кнопку на цей час: без цього
  // подвійний тап додав би два дні.
  const [isAddingDay, startTransition] = useTransition();
  const addDay = () => {
    startTransition(() => {
      append({ id: newId(), exercises: [] }, { shouldFocus: false });
      router.push(`${basePath}/days/${fields.length}`);
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      // помилку показує error вище, вдруге її не обробляємо
    }
  });

  const confirmDelete = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
    } catch {
      // помилку показує deleteError у шторці, шторка лишається відкритою
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <ScreenHeader title={title} subtitle={subtitle} backHref={backHref} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {error && (
          <div className="mb-4 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
            {error}
          </div>
        )}

        <label htmlFor="program-name" className={`block ${sectionLabel} !pt-1`}>
          Назва
        </label>
        <input
          id="program-name"
          type="text"
          autoComplete="off"
          placeholder="Наприклад: Верх / Низ 4×"
          className="h-[58px] w-full rounded-field bg-surface px-4 text-lead font-medium text-text outline-none inset-ring-1 inset-ring-line placeholder:text-dim-2 focus:inset-ring-2 focus:inset-ring-accent"
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-2 px-1 text-meta text-warn">{errors.name.message}</p>
        )}

        <h2 className={sectionLabel}>Дні</h2>
        {fields.map((field, i) => {
          const exerciseCount = days[i]?.exercises.length ?? 0;
          const hasErrors = Boolean(errors.days?.[i]?.exercises);
          const warn = exerciseCount === 0 || hasErrors;
          return (
            <DayRow
              key={field.id}
              href={`${basePath}/days/${i}`}
              letter={dayLabel(i).slice(-1)}
              title={dayLabel(i)}
              warn={warn}
              subtitle={
                exerciseCount === 0
                  ? "Додай вправи"
                  : hasErrors
                    ? "Перевір вправи"
                    : `${exerciseCount} ${pluralizeUk(exerciseCount, ["вправа", "вправи", "вправ"])}`
              }
            />
          );
        })}
        {arrayErrorMessage(errors.days) && (
          <p className="mb-2 px-1 text-meta text-warn">
            {arrayErrorMessage(errors.days)}
          </p>
        )}
        {/* Заготовка наступного дня: та сама форма й висота, що в DayRow,
            тільки пунктирна — видно, куди саме ляже новий день */}
        <button
          type="button"
          onClick={addDay}
          disabled={isAddingDay}
          className="group mb-2 flex min-h-[72px] w-full items-center gap-3 rounded-card border border-dashed border-dim-2/60 px-4 py-3.5 text-left transition-[border-color,transform] duration-150 ease-out outline-none hover:border-accent/70 focus-visible:border-accent active:scale-[.985] disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-chip border border-dashed border-dim-2/60 font-display text-label font-bold text-accent transition-colors group-hover:border-accent/70">
            {dayLabel(fields.length).slice(-1)}
          </span>
          <span className="min-w-0 flex-1 text-body font-medium text-dim transition-colors group-hover:text-text">
            Додати день {dayLabel(fields.length).slice(-1)}
          </span>
          <Plus size={20} strokeWidth={2} className="flex-none text-accent" />
        </button>
        <p className="mt-1 px-1 text-meta leading-relaxed text-dim">
          День — це один похід у зал. Порядок вільний.
        </p>

        <div className="mt-6">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <SwitchRow
                title="Зробити активною"
                description="Ця програма буде на головній і в кнопці старту"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="mt-8 flex h-14 w-full items-center justify-center gap-2.5 rounded-card text-body font-semibold text-danger inset-ring-1 inset-ring-danger/30 transition-[background-color,transform] duration-150 ease-out hover:bg-danger/10 active:scale-[.985]"
          >
            <Trash2 size={18} strokeWidth={2} />
            Видалити програму
          </button>
        )}
      </div>

      <ActionBar>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? "Зберігаємо…" : submitLabel}
        </button>
      </ActionBar>

      {onDelete && (
        <ConfirmSheet
          open={isConfirmingDelete}
          title="Видалити програму?"
          description="Програма зникне разом з усіма днями й вправами. Цю дію не можна скасувати."
          confirmLabel="Видалити програму"
          onConfirm={confirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
          pending={isDeleting}
          error={deleteError}
        />
      )}
    </form>
  );
}
