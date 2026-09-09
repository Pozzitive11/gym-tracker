# backend — NestJS 12

Загальні правила проєкту й навчальний режим — у кореневому `CLAUDE.md`.

## Стек

- NestJS 12 на Express, TypeScript 6
- Drizzle ORM + drizzle-kit, Postgres 18 (у Docker)
- class-validator + class-transformer для DTO
- `@nestjs/swagger` — джерело OpenAPI-схеми для фронту
- `@nestjs/jwt` + passport-jwt, паролі через `@node-rs/argon2`

## Пастки цього скафолду

Nest 12 змінив дефолти. Три речі, на яких легко помилитися:

**Це ESM** (`"type": "module"`). У відносних імпортах обов'язкове розширення
`.js`, навіть якщо файл на диску — `.ts`:

```ts
import { AppModule } from './app.module.js';   // на диску app.module.ts
```

**Тести — Vitest 4, не Jest.** Ніяких `jest.mock`, `jest.fn`, `jest.config`.
Мокати через `vi.mock`, `vi.fn`. Конфіги: `vitest.config.ts` (unit) та
`vitest.config.e2e.ts` (e2e).

**Лінтер — oxlint, не ESLint.** `npm run lint`. Файлів `.eslintrc` тут немає
й бути не має. На фронті при цьому ESLint — не плутати.

## Конвенції

**DTO.** Кожен вхідний body — клас із декораторами class-validator, увімкнений
глобальний `ValidationPipe` з `whitelist: true`. Zod на бекенді не
використовується (він живе на фронті, для форм).

**`@ApiProperty` обов'язковий** на полях DTO і `@ApiResponse` на ендпоїнтах.
Це не документація заради документації: з цієї схеми генерується клієнт фронту.
Пропущений декоратор = дірка в типах на тому боці.

**Drizzle.** Схема — `src/db/schema.ts`, міграції генеруються drizzle-kit і
комітяться. Руками SQL-міграції не правити. З'єднання віддається через
Nest-провайдер, щоб його можна було підмінити в тестах.

**Модулі.** Одна доменна область — один модуль (`programs`, `workouts`,
`exercises`, `auth`). Контролер тонкий: розбір запиту й виклик сервісу.
Бізнес-логіка — у сервісі. Доступ до БД — у репозиторії, не в контролері.

## Команди

```bash
npm run start:dev     # watch-режим
npm run build
npm test              # vitest, unit
npm run test:e2e      # vitest, потребує піднятого Postgres
npm run lint          # oxlint
```

## Env

`.env` (див. `.env.example`): `PORT=3001`, `DATABASE_URL`, `JWT_SECRET`.
Змінні валідуються на старті через `@nestjs/config` — падати треба одразу,
а не в рантаймі посеред запиту.
