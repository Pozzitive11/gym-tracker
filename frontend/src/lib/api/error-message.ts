export function errorMessage(message: string | string[]): string {
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  return message;
}
