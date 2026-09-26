import { z } from "zod";
import type { components } from "@/lib/api/schema";

// Правила дзеркалять CreateProgramDto на бекенді: бекенд лишається джерелом
// правди, а тут — швидка відповідь юзеру без походу в мережу.
const exerciseSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Введи назву вправи"),
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
      exercises: day.exercises.map(({ id, name, targetSets, targetReps }) => ({
        id,
        name,
        targetSets,
        targetReps,
      })),
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
      exercises: day.exercises,
    })),
  };
}

// Створення — те саме плюс id: його генерує клієнт, тому повторний POST
// після загубленої відповіді бекенд впізнає (409)
export function toCreateProgramBody(values: ProgramFormValues) {
  return { id: values.id, ...toUpdateProgramBody(values) };
}
