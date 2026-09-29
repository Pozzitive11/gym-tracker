import { z } from "zod";
import type { components } from "@/lib/api/schema";

// Правила дзеркалять CreateProgramDto на бекенді: бекенд лишається джерелом
// правди, а тут — швидка відповідь юзеру без походу в мережу.
const exerciseSchema = z.object({
  id: z.uuid(),
  // Порожній рядок — вправу ще не обрали; uuid() відсіює і його
  exerciseId: z.uuid({ error: "Обери вправу" }),
  // Назва з каталогу — лише для показу в рядку, на бекенд не йде
  name: z.string(),
  // valueAsNumber віддає NaN для порожнього поля — окреме повідомлення на це
  targetSets: z
    .number({ error: "Введи число" })
    .int("Ціле число")
    .min(1, "Мінімум 1"),
  targetReps: z
    .number({ error: "Введи число" })
    .int("Ціле число")
    .min(1, "Мінімум 1"),
});

// Назви дня у формі нема свідомо: вона рахується з позиції (dayLabel) під
// час відправки, тож видалення дня посередині не залишає «дір» у літерах
const daySchema = z.object({
  id: z.uuid(),
  exercises: z.array(exerciseSchema).min(1, "Додай хоча б одну вправу"),
});

export const programSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Введи назву програми"),
  isActive: z.boolean(),
  days: z.array(daySchema).min(1, "Додай хоча б один день"),
});

export type ProgramFormValues = z.infer<typeof programSchema>;

const CHAR_CODE_A = 65;

export const dayLabel = (index: number) =>
  `День ${String.fromCharCode(CHAR_CODE_A + index)}`;

type ProgramResponse = components["schemas"]["ProgramResponseDto"];

// Сервер → форма. Назву дня відкидаємо: у формі вона рахується з позиції.
// id днів і вправ — серверні, не нові: рядки лишаються тими самими
// сутностями, і перехід бекенду з повної заміни на дифф нічого не зламає
export function toFormValues(program: ProgramResponse): ProgramFormValues {
  return {
    id: program.id,
    name: program.name,
    isActive: program.isActive,
    days: program.days.map((day) => ({
      id: day.id,
      exercises: day.exercises.map(
        ({ id, exerciseId, name, targetSets, targetReps }) => ({
          id,
          exerciseId,
          name,
          targetSets,
          targetReps,
        }),
      ),
    })),
  };
}

// Форма → тіло PUT. id програми живе в URL (PUT /programs/:id), тож у тілі
// його нема — інакше він приходив би двічі
export function toUpdateProgramBody(values: ProgramFormValues) {
  return {
    name: values.name,
    isActive: values.isActive,
    days: values.days.map((day, index) => ({
      id: day.id,
      name: dayLabel(index),
      // name — лише для показу; у тілі тільки посилання на каталог
      exercises: day.exercises.map(
        ({ id, exerciseId, targetSets, targetReps }) => ({
          id,
          exerciseId,
          targetSets,
          targetReps,
        }),
      ),
    })),
  };
}

// Створення — те саме плюс id: його генерує клієнт, тому повторний POST
// після загубленої відповіді бекенд впізнає (409)
export function toCreateProgramBody(values: ProgramFormValues) {
  return { id: values.id, ...toUpdateProgramBody(values) };
}

// Помилка рівня масиву (min(1) у днях чи вправах) від zodResolver лежить у
// різних місцях: у errors.x.root.message, якщо в масиві вже реєструвались
// поля (x.0.name тощо), інакше в errors.x.message. Після видалення всіх
// елементів це саме перший випадок — тож читаємо обидва місця
export function arrayErrorMessage(
  error: { message?: string; root?: { message?: string } } | undefined,
) {
  return error?.root?.message ?? error?.message;
}
