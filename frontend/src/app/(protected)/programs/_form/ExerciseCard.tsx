import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, X } from "lucide-react";
import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

// Пропозиція контракту (нове відносно попередньої версії): id — ідентифікатор
// для сортування (field.id з useFieldArray), stepField/stepError — необов'язкове
// третє поле «Крок, кг»: поки його нема, третя колонка просто не малюється.
// Назва більше не вводиться текстом: onPickExercise відкриває каталог, а
// exerciseError — помилка поля exerciseId.
interface ExerciseCardProps {
  id: string;
  title: string;
  subtitle: string;
  warn?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onPickExercise: () => void;
  setsField: UseFormRegisterReturn;
  repsField: UseFormRegisterReturn;
  stepField?: UseFormRegisterReturn;
  exerciseError?: string;
  setsError?: string;
  repsError?: string;
  stepError?: string;
}

const fieldBase =
  "w-full rounded-field bg-bg outline-none inset-ring-1 inset-ring-line focus:inset-ring-2 focus:inset-ring-accent";

const labelClass =
  "mb-2 block text-micro font-semibold tracking-kicker text-dim uppercase";

// Згорнутий рядок: грип + назва + «підходи × повтори» + хрестик. Тап по
// назві розкриває панель редагування під рядком; тягнути можна лише за грип.
export function ExerciseCard({
  id,
  title,
  subtitle,
  warn,
  isOpen,
  onToggle,
  onRemove,
  onPickExercise,
  setsField,
  repsField,
  stepField,
  exerciseError,
  setsError,
  repsError,
  stepError,
}: ExerciseCardProps) {
  const panelId = useId();
  const trimmedTitle = title.trim();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    // та сама крива, що й в решти застосунку, замість дефолтної ease
    transition: { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
  });

  return (
    // Один корінь на рядок + панель: dnd-kit зсуває їх разом.
    // transform ставить сама бібліотека; relative + z-10 піднімають
    // перетягувану картку над сусідніми, які теж мають transform.
    // motion-reduce перебиває inline-transition із бібліотеки.
    // Відкрита вправа: корінь стає єдиною карткою (рядок + панель) з
    // акцентною обводкою. Саме border, а не ring: ring — це box-shadow
    // поза межами елемента, і на шарі з transform Chrome після різкого
    // згортання лишав його смуги на місці старої висоти. Рамка є завжди
    // (прозора в згорнутому стані), щоб вміст не зсувався на 1px.
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-card border motion-reduce:transition-none! ${isDragging ? "z-10" : ""} ${
        isOpen
          ? `mb-2 border-accent/60 bg-surface-2 ${isDragging ? "shadow-drag" : ""}`
          : "border-transparent"
      }`}
    >
      <div
        className={`flex items-center gap-1 rounded-card py-3 pr-3.5 pl-1.5 transition-colors duration-150 ${
          isOpen
            ? ""
            : `mb-2 ${isDragging ? "bg-surface-2 shadow-drag" : "bg-surface"}`
        }`}
      >
        {/* touch-none: без нього браузер на телефоні забирає жест собі
            (прокрутка сторінки) і перетягування не починається */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          data-grip
          {...attributes}
          {...listeners}
          aria-label="Перетягнути вправу"
          className={`grid h-11 w-9 flex-none touch-none place-items-center rounded-control text-dim-2 outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-accent ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <GripVertical size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="ml-1.5 min-w-0 flex-1 rounded-control text-left outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-accent"
        >
          <span
            className={`block truncate text-body font-medium ${
              trimmedTitle ? (isOpen ? "text-accent" : "") : "text-dim-2"
            }`}
          >
            {trimmedTitle || "Нова вправа"}
          </span>
          <span
            className={`mt-1 block text-meta tabular-nums ${warn ? "text-warn" : "text-dim"}`}
          >
            {subtitle}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Видалити вправу"
          className="grid h-10 w-10 flex-none place-items-center rounded-control text-dim-2 transition-colors hover:text-danger active:text-danger"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {isOpen && (
        // Клік по «порожньому» місцю панелі (поля, відступи, проміжки між
        // колонками) теж згортає її. Поля й підписи виключені: клік по
        // <label> фокусує поле, і згортання його б вбило. Це лише
        // скорочення для вказівника, з клавіатури є кнопка-заголовок.
        <div
          id={panelId}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("input, label, button"))
              return;
            onToggle();
          }}
          className="px-4 pt-1 pb-4"
        >
          <span className={labelClass}>Вправа</span>
          <button
            type="button"
            onClick={onPickExercise}
            className={`${fieldBase} flex h-14 items-center gap-2 px-4 text-left text-body transition-transform duration-150 ease-out active:scale-[.985]`}
          >
            <span
              className={`min-w-0 flex-1 truncate ${trimmedTitle ? "" : "text-dim-2"}`}
            >
              {trimmedTitle || "Обрати з каталогу"}
            </span>
            <ChevronRight
              size={18}
              strokeWidth={2}
              className="flex-none text-dim-2"
            />
          </button>
          {exerciseError && (
            <span className="mt-2 block text-meta text-warn">
              {exerciseError}
            </span>
          )}

          <div className="mt-3 flex gap-2">
            <NumberField label="Підходи" error={setsError} field={setsField} />
            <NumberField label="Повтори" error={repsError} field={repsField} />
            {stepField && (
              <NumberField
                label="Крок, кг"
                error={stepError}
                field={stepField}
                decimal
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  error,
  field,
  decimal,
}: {
  label: string;
  error?: string;
  field: UseFormRegisterReturn;
  decimal?: boolean;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        className={`${fieldBase} h-14 px-3 text-center font-display text-[20px] font-bold tabular-nums`}
        {...field}
      />
      {error && <span className="mt-2 block text-meta text-warn">{error}</span>}
    </label>
  );
}
