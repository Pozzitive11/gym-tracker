import { errorMessage } from "./error-message";
import type { components } from "./schema";

type ErrorBody = components["schemas"]["ErrorResponseDto"];

// Помилка HTTP-відповіді (4xx/5xx). Збій мережі сюди не потрапляє: fetch кидає
// TypeError сам, і apiErrorText відрізняє ці два випадки
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// openapi-fetch не кидає виняток на 4xx/5xx, а повертає їх в error. TanStack
// Query розпізнає помилку лише за виняткою, тож перетворюємо це тут — в
// одному місці для всіх викликів
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (!result.response.ok) {
    // За типом error це ErrorResponseDto, але в рантаймі openapi-fetch
    // віддає сирий текст (не JSON від проксі) або undefined (порожнє тіло)
    const message = (result.error as Partial<ErrorBody> | undefined)?.message;
    throw new ApiError(
      result.response.status,
      message ? errorMessage(message) : "Сталася помилка. Спробуй ще раз.",
    );
  }
  // Успішна відповідь без тіла (201) дає undefined, тоді T це undefined
  return result.data as T;
}

// Текст для юзера з будь-якої помилки виклику: відповідь сервера або збій мережі
export function apiErrorText(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Немає зв'язку з сервером. Перевір інтернет і спробуй ще раз.";
}
