import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

// Коди помилок Postgres. Повний перелік — у документації, розділ
// «PostgreSQL Error Codes»
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

// Усі порушення унікальності дають той самий код 23505, тож що саме сталося,
// видно лише з імені обмеження. Повідомлення користувачу мають відрізнятися:
// «така програма вже є» і «у вас уже є активна програма» — різні ситуації
const MESSAGE_BY_CONSTRAINT: Record<string, string> = {
  programs_pkey: 'Програма з таким id вже існує',
  programs_one_active_per_user:
    'У вас уже може бути лише одна активна програма',
  users_email_unique: 'User with this email already exists',
};

interface PgError {
  code: string;
  constraint?: string;
}

// Drizzle загортає помилку драйвера у власну, тож код лежить або на самій
// помилці, або в .cause. Перевіряємо обидва місця
function asPgError(error: unknown): PgError | undefined {
  const candidates = [error, (error as { cause?: unknown })?.cause];

  for (const candidate of candidates) {
    const code = (candidate as { code?: unknown } | undefined)?.code;
    if (typeof code === 'string') {
      return {
        code,
        constraint: (candidate as { constraint?: string }).constraint,
      };
    }
  }

  return undefined;
}

// @Catch() без аргументів ловить усе. Тому перше, що робимо — пропускаємо далі
// те, що вже є HttpException: NotFoundException із сервісу має лишитись 404,
// а не потрапити під розбір нижче
@Catch()
export class PostgresExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      return super.catch(exception, host);
    }

    const pgError = asPgError(exception);

    if (pgError?.code === UNIQUE_VIOLATION) {
      const message =
        MESSAGE_BY_CONSTRAINT[pgError.constraint ?? ''] ??
        'Запис із такими даними вже існує';
      return super.catch(new ConflictException(message), host);
    }

    // Посилання на неіснуючий рядок — це невалідні дані від клієнта, 400.
    // Не 500: сервер працює правильно, помилився запит
    if (pgError?.code === FOREIGN_KEY_VIOLATION) {
      return super.catch(
        new BadRequestException('Посилання на неіснуючий запис'),
        host,
      );
    }

    // Решта — справжні 500. Не ховаємо: про них треба дізнатись
    return super.catch(exception, host);
  }
}
