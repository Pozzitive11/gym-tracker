// Українська множина має три форми (на відміну від англійської — двох):
// 1 день / 2 дні / 5 днів. Правило стандартне для слов'янських мов:
// залишок від ділення на 10 і на 100 визначає форму.
export function pluralizeUk(
  count: number,
  [one, few, many]: [string, string, string],
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
