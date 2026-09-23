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
import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { newId } from "@/lib/id";
import { pluralizeUk } from "@/lib/pluralize";
import { ActionBar } from "../../ActionBar";
import { ExerciseCard } from "../../ExerciseCard";
import { ScreenHeader } from "../../ScreenHeader";
import { dayLabel, type ProgramFormValues } from "../../program.schema";

// Стартові значення нової вправи — юзер одразу бачить робочий варіант
// і править лише те, що відрізняється
const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 14;

export default function DayEditorPage() {
  const params = useParams<{ index: string }>();
  const index = Number(params.index);
  const router = useRouter();
  const { control } = useFormContext<ProgramFormValues>();
  const days = useWatch({ control, name: "days" });

  // Після F5 layout створюється заново, чернетка порожня — дня з таким
  // індексом уже нема. Повертаємо на головну форму замість порожнього екрана.
  const exists = Number.isInteger(index) && index >= 0 && index < days.length;
  useEffect(() => {
    if (!exists) router.replace("/programs/new");
  }, [exists, router]);

  if (!exists) return null;
  return <DayEditor index={index} />;
}

function DayEditor({ index }: { index: number }) {
  const router = useRouter();
  const {
    control,
    trigger,
    getFieldState,
    formState: { errors },
  } = useFormContext<ProgramFormValues>();
  const exercises = useWatch({ control, name: `days.${index}.exercises` });
  const exerciseCount = exercises?.length ?? 0;

  // Яка вправа розкрита — суто стан вигляду. Живе тут, а не в ExerciseList,
  // бо «Готово» має розкрити вправу з помилкою. Якщо після невдалого
  // збереження в цьому дні вже є помилки, одразу розкриваємо першу з них.
  const [openIndex, setOpenIndex] = useState<number | null>(() => {
    const dayErrors = errors.days?.[index]?.exercises;
    const first = (exercises ?? []).findIndex((_, i) => Boolean(dayErrors?.[i]));
    return first === -1 ? null : first;
  });

  const onDone = async () => {
    // Порожній день не блокуємо: головний екран і так підсвічує «Додай вправи»,
    // а кнопки видалення дня тут нема — інакше з нього не було б виходу
    if (exerciseCount > 0) {
      // Перевіряємо лише вправи цього дня, не всю форму. trigger записує
      // помилки в errors (вони з'являються під полями) і повертає, чи все ок
      const paths = Array.from(
        { length: exerciseCount },
        (_, i) => `days.${index}.exercises.${i}` as const,
      );
      const valid = await trigger(paths);
      if (!valid) {
        // Згорнута вправа ховає поля з помилками — розкриваємо першу таку.
        // getFieldState, а не errors: errors тут — знімок з моменту рендера,
        // до trigger, і нових помилок у ньому ще нема
        const first = paths.findIndex((path) => getFieldState(path).invalid);
        setOpenIndex(first === -1 ? null : first);
        return;
      }
    }
    router.push("/programs/new");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        title={dayLabel(index)}
        subtitle={`${exerciseCount} ${pluralizeUk(exerciseCount, ["вправа", "вправи", "вправ"])}`}
        backHref="/programs/new"
      />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <ExerciseList
          index={index}
          openIndex={openIndex}
          setOpenIndex={setOpenIndex}
        />
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

  const addExercise = () => {
    append({
      id: newId(),
      name: "",
      targetSets: DEFAULT_TARGET_SETS,
      targetReps: DEFAULT_TARGET_REPS,
    });
    setOpenIndex(fields.length);
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
                  onToggle={() => setOpenIndex((open) => (open === i ? null : i))}
                  onRemove={() => removeExercise(i)}
                  nameField={register(`${base}.name`, {
                    onChange: revalidateIfInvalid(`${base}.name`),
                  })}
                  setsField={register(`${base}.targetSets`, {
                    valueAsNumber: true,
                    onChange: revalidateIfInvalid(`${base}.targetSets`),
                  })}
                  repsField={register(`${base}.targetReps`, {
                    valueAsNumber: true,
                    onChange: revalidateIfInvalid(`${base}.targetReps`),
                  })}
                  nameError={fieldErrors?.name?.message}
                  setsError={fieldErrors?.targetSets?.message}
                  repsError={fieldErrors?.targetReps?.message}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {exerciseErrors?.message && (
        <p className="mb-2 px-1 text-meta text-warn">{exerciseErrors.message}</p>
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
    </>
  );
}

// Порожнє числове поле дає NaN — у згорнутому рядку показуємо «?»
const formatCount = (n: number | undefined) =>
  n !== undefined && Number.isFinite(n) ? String(n) : "?";
