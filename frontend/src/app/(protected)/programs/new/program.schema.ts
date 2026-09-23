import { z } from "zod";

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

export function toCreateProgramBody(values: ProgramFormValues) {
  return {
    id: values.id,
    name: values.name,
    isActive: values.isActive,
    days: values.days.map((day, index) => ({
      id: day.id,
      name: dayLabel(index),
      exercises: day.exercises,
    })),
  };
}
