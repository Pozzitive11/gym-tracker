"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { newId } from "@/lib/id";
import { pluralizeUk } from "@/lib/pluralize";
import { ActionBar } from "./ActionBar";
import { ConfirmSheet } from "./ConfirmSheet";
import { ExerciseCard } from "./ExerciseCard";
import { ScreenHeader } from "./ScreenHeader";
import {
  arrayErrorMessage,
  dayLabel,
  type ProgramFormValues,
} from "./program.schema";

// Стартові значення нової вправи — юзер одразу бачить робочий варіант
// і править лише те, що відрізняється
const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 14;

// basePath — корінь піддерева форми, куди повертаємось із редактора дня:
// "/programs/new" або `/programs/${id}/edit`
export function ProgramDayEditor({ basePath }: { basePath: string }) {
  const params = useParams<{ index: string }>();
  const index = Number(params.index);
  const router = useRouter();
  const { control } = useFormContext<ProgramFormValues>();
  const days = useWatch({ control, name: "days" });

  // Після F5 на створенні layout створюється заново, чернетка порожня — дня
  // з таким індексом уже нема (на редагуванні так буває з ручним URL).
  // Повертаємо на головну форму замість порожнього екрана.
  const exists = Number.isInteger(index) && index >= 0 && index < days.length;
  useEffect(() => {
    if (!exists) router.replace(basePath);
  }, [exists, router, basePath]);

  if (!exists) return null;
  return <DayEditor index={index} basePath={basePath} />;
}

function DayEditor({ index, basePath }: { index: number; basePath: string }) {
  const router = useRouter();
  const {
    control,
    trigger,
    getFieldState,
    formState: { errors },
  } = useFormContext<ProgramFormValues>();
  const exercises = useWatch({ control, name: `days.${index}.exercises` });
  const exerciseCount = exercises?.length ?? 0;
  // Масив днів — лише заради remove: видалення дня змінює саму форму, а на
  // бекенд піде разом з усім іншим по «Зберегти» (PUT замінює все дерево)
  const { fields: dayFields, remove: removeDay } = useFieldArray({
    control,
    name: "days",
  });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Яка вправа розкрита — суто стан вигляду. Живе тут, а не в ExerciseList,
  // бо «Готово» має розкрити вправу з помилкою. Якщо після невдалого
  // збереження в цьому дні вже є помилки, одразу розкриваємо першу з них.
  const [openIndex, setOpenIndex] = useState<number | null>(() => {
    const dayErrors = errors.days?.[index]?.exercises;
    const first = (exercises ?? []).findIndex((_, i) =>
      Boolean(dayErrors?.[i]),
    );
    return first === -1 ? null : first;
  });

  const onDone = async () => {
    // Перевіряємо лише цей день, не всю форму: і правило «хоча б одна
    // вправа» (порожній день не пропускаємо — для непотрібного є «Видалити
    // день»), і кожну вправу. trigger на шляху масиву перевіряє все піддерево,
    // записує помилки в errors і повертає, чи все ок
    const valid = await trigger(`days.${index}.exercises`);
    if (!valid) {
      // Згорнута вправа ховає поля з помилками — розкриваємо першу таку.
      // getFieldState, а не errors: errors тут — знімок з моменту рендера,
      // до trigger, і нових помилок у ньому ще нема
      const first = Array.from({ length: exerciseCount }, (_, i) => i).find(
        (i) => getFieldState(`days.${index}.exercises.${i}`).invalid,
      );
      setOpenIndex(first ?? null);
      return;
    }
    router.push(basePath);
  };

  // Видалення і перехід — в одній транзиції, як «Додати день» у ProgramForm.
  // Інакше між ними був би рендер, у якому URL досі days/N, а під індексом N
  // уже НАСТУПНИЙ день: юзер на мить побачив би чужий день. replace, не push:
  // URL видаленого дня не має лишатися в історії
  const [isDeleting, startDeleteTransition] = useTransition();
  const deleteDay = () => {
    startDeleteTransition(() => {
      removeDay(index);
      router.replace(basePath);
    });
  };

  // Порожній день видаляємо без питань — втрачати нічого. З вправами —
  // через підтвердження
  const requestDelete = () => {
    if (exerciseCount === 0) deleteDay();
    else setIsConfirmingDelete(true);
  };

  const isLastDay = index === dayFields.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        title={dayLabel(index)}
        subtitle={`${exerciseCount} ${pluralizeUk(exerciseCount, ["вправа", "вправи", "вправ"])}`}
        backHref={basePath}
      />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <ExerciseList
          index={index}
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        />

        <button
          type="button"
          onClick={requestDelete}
          disabled={isDeleting}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2.5 rounded-card text-body font-semibold text-danger inset-ring-1 inset-ring-danger/30 transition-[background-color,transform] duration-150 ease-out hover:bg-danger/10 active:scale-[.985] disabled:pointer-events-none disabled:opacity-40"
        >
          <Trash2 size={18} strokeWidth={2} />
          Видалити день
        </button>
      </div>

      <ActionBar>
        <button
          type="button"
          onClick={onDone}
          className="grid h-[66px] w-full place-items-center rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975]"
        >
          Готово
        </button>
      </ActionBar>

      <ConfirmSheet
        open={isConfirmingDelete}
        title={`Видалити ${dayLabel(index)}?`}
        description={
          `Разом із днем зникне ${exerciseCount} ${pluralizeUk(exerciseCount, ["вправа", "вправи", "вправ"])}.` +
          (isLastDay
            ? ""
            : ` Наступні дні зсунуться: ${dayLabel(index + 1)} стане ${dayLabel(index)}.`) +
          " Остаточно — після збереження програми."
        }
        confirmLabel="Видалити день"
        onConfirm={deleteDay}
        onCancel={() => setIsConfirmingDelete(false)}
        pending={isDeleting}
      />
    </div>
  );
}

function ExerciseList({
  index,
  openIndex,
  setOpenIndex,
}: {
  index: number;
  openIndex: number | null;
  setOpenIndex: Dispatch<SetStateAction<number | null>>;
}) {
  const {
    control,
    register,
    trigger,
    getFieldState,
    clearErrors,
    setValue,
    formState: { errors },
  } = useFormContext<ProgramFormValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `days.${index}.exercises`,
  });
  // fields — знімок на момент дії, а назва/підходи/повтори змінюються в
  // полях панелі; для згорнутого рядка беремо живі значення
  const exercises = useWatch({ control, name: `days.${index}.exercises` });
  const exerciseErrors = errors.days?.[index]?.exercises;

  // Після «Готово» помилка має зникати, щойно поле виправили. Сам RHF
  // перевіряє на ввід лише після handleSubmit усієї форми (reValidateMode),
  // а trigger форму «надісланою» не робить — тож перевіряємо вручну, і лише
  // поля, які вже червоні: чисті поля не лаються, поки юзер ще вводить
  const revalidateIfInvalid = (path: FieldPath<ProgramFormValues>) => () => {
    if (getFieldState(path).invalid) void trigger(path);
  };

  // Для чого відкрито каталог: null — нова вправа, число — заміна вправи
  // з цим індексом. undefined — шторка закрита
  const [pickerTarget, setPickerTarget] = useState<number | null | undefined>(
    undefined,
  );

  // «Додати вправу» спершу відкриває каталог: рядок з'являється вже з
  // обраною вправою, порожніх «Нова вправа» у списку не буває
  const addExercise = () => setPickerTarget(null);

  const onPickExercise = ({ id, name }: { id: string; name: string }) => {
    if (pickerTarget === null) {
      // Перша вправа знімає помилку «Додай хоча б одну вправу». Чистимо весь
      // шлях лише коли вправ не було: тоді інших помилок під ним бути не може
      if (fields.length === 0) clearErrors(`days.${index}.exercises`);
      append({
        id: newId(),
        exerciseId: id,
        name,
        targetSets: DEFAULT_TARGET_SETS,
        targetReps: DEFAULT_TARGET_REPS,
      });
      // Нова вправа одразу розкрита: наступне, що юзер робить, — підганяє
      // підходи й повтори. fields.length — ще довжина ДО append, тобто
      // якраз індекс щойно доданого рядка
      setOpenIndex(fields.length);
    } else if (pickerTarget !== undefined) {
      const base = `days.${index}.exercises.${pickerTarget}` as const;
      setValue(`${base}.name`, name, { shouldDirty: true });
      setValue(`${base}.exerciseId`, id, { shouldDirty: true });
      revalidateIfInvalid(`${base}.exerciseId`)();
      setOpenIndex(pickerTarget);
    }
    setPickerTarget(undefined);
  };

  const removeExercise = (i: number) => {
    remove(i);
    setOpenIndex((open) => {
      if (open === null || open === i) return null;
      return open > i ? open - 1 : open;
    });
  };

  // Перетягування — саме на грипі (див. ExerciseCard). distance: 4 — щоб
  // випадковий дотик не вважався початком жесту. Клавіатура: Space піднімає,
  // стрілки рухають, Space опускає.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // Без явного id dnd-kit генерує лічильник, який на сервері й на клієнті
  // розходиться — Next ловить це як помилку гідратації.
  const dndId = useId();

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setOpenIndex(null);
    if (!over || active.id === over.id) return;
    // dnd-kit знає лише id, а move() працює з індексами. Порядок міняємо
    // в самій формі (move з useFieldArray): саме він піде на бекенд, а
    // dnd-kit після відпускання просто повертає картку в нову розкладку.
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from === -1 || to === -1) return;
    move(from, to);
  };

  return (
    <>
      <h2 className="px-1 pt-1 pb-2.5 text-tag font-semibold tracking-kicker text-dim uppercase">
        Вправи по порядку
      </h2>

      {/* Відкрита панель під час перетягування — це висока картка, що
          зсуває сусідів. Тож на натиск по грипу (capture — до dnd-kit)
          згортаємо все до початку жесту, а не після. */}
      <div
        onPointerDownCapture={(e) => {
          if ((e.target as HTMLElement).closest("[data-grip]")) {
            setOpenIndex(null);
          }
        }}
      >
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field, i) => {
              const base = `days.${index}.exercises.${i}` as const;
              const fieldErrors = exerciseErrors?.[i];
              const value = exercises?.[i];
              return (
                <ExerciseCard
                  key={field.id}
                  id={field.id}
                  title={value?.name ?? ""}
                  subtitle={
                    fieldErrors
                      ? "Перевір вправу"
                      : `${formatCount(value?.targetSets)} × ${formatCount(value?.targetReps)}`
                  }
                  warn={Boolean(fieldErrors)}
                  isOpen={openIndex === i}
                  onToggle={() =>
                    setOpenIndex((open) => (open === i ? null : i))
                  }
                  onRemove={() => removeExercise(i)}
                  onPickExercise={() => setPickerTarget(i)}
                  setsField={register(`${base}.targetSets`, {
                    valueAsNumber: true,
                    onChange: revalidateIfInvalid(`${base}.targetSets`),
                  })}
                  repsField={register(`${base}.targetReps`, {
                    valueAsNumber: true,
                    onChange: revalidateIfInvalid(`${base}.targetReps`),
                  })}
                  exerciseError={fieldErrors?.exerciseId?.message}
                  setsError={fieldErrors?.targetSets?.message}
                  repsError={fieldErrors?.targetReps?.message}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {arrayErrorMessage(exerciseErrors) && (
        <p className="mb-2 px-1 text-meta text-warn">
          {arrayErrorMessage(exerciseErrors)}
        </p>
      )}

      <button
        type="button"
        onClick={addExercise}
        // Заготовка наступної вправи: та сама висота й відступи, що в
        // згорнутого рядка ExerciseCard, плюс стоїть на місці грипа
        className="group mb-2 flex min-h-[68px] w-full items-center gap-1 rounded-card border border-dashed border-dim-2/60 py-3 pr-3.5 pl-1.5 text-left transition-[border-color,transform] duration-150 ease-out outline-none hover:border-accent/70 focus-visible:border-accent active:scale-[.985]"
      >
        <span className="grid h-11 w-9 flex-none place-items-center text-accent">
          <Plus size={18} strokeWidth={2} />
        </span>
        <span className="ml-1.5 min-w-0 flex-1 text-body font-medium text-dim transition-colors group-hover:text-text">
          Додати вправу
        </span>
      </button>

      <ExercisePickerSheet
        open={pickerTarget !== undefined}
        selectedId={
          pickerTarget != null
            ? exercises?.[pickerTarget]?.exerciseId
            : undefined
        }
        onPick={onPickExercise}
        onClose={() => setPickerTarget(undefined)}
      />
    </>
  );
}

// Порожнє числове поле дає NaN — у згорнутому рядку показуємо «?»
const formatCount = (n: number | undefined) =>
  n !== undefined && Number.isFinite(n) ? String(n) : "?";
