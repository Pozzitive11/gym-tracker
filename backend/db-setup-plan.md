# Налаштування БД під наявну автентифікацію

Робочий документ. Видалити, коли всі кроки закриті.

## Вихідна проблема

Код `src/auth/*` і `src/entities/*` написаний під **TypeORM** (`@nestjs/typeorm`,
`Repository`, `QueryFailedError`, `bcrypt`), але в `package.json` цих пакетів
немає. Встановлені `drizzle-orm`, `drizzle-kit`, `pg`, `@node-rs/argon2`.
Тобто бекенд зараз не збирається взагалі.

## Ухвалені рішення

| Питання | Рішення | Чому |
|---|---|---|
| ORM | **Drizzle** | Відповідає `CLAUDE.md`, залежності вже стоять |
| ID у `users` / `sessions` | **UUIDv7** | Однорідно з рештою сутностей проєкту |
| Джерело UUID | `DEFAULT uuidv7()` у Postgres 18 | DEFAULT спрацьовує лише коли значення не передали, тож «ID генерує клієнт» лишається в силі |
| Хешування | `@node-rs/argon2` замість `bcrypt` | argon2 встановлений, bcrypt — ні |
| `db:push` | не додаємо | Міграції комітяться; два шляхи зміни схеми рано чи пізно розійдуться |

## Кроки

### 1. Скафолдинг — ЗРОБЛЕНО (асистент)

- `.env` — викинуто мертві `DB_HOST/DB_USERNAME=root/DB_NAME=gym-manager`
  (вели в неіснуючу базу), додано `PORT=3001`. `.env.example` синхронізовано.
- `drizzle.config.ts` — створено. `.env` читається через `process.loadEnvFile`,
  бо drizzle-kit запускається повз Nest і про `ConfigModule` не знає.
- npm-скрипти: `db:generate`, `db:migrate`, `db:studio`.
- Поставлено `cookie-parser` + `@types/cookie-parser`.

### 2. `src/db/schema.ts` — ТАБЛИЦІ ГОТОВІ, лишились рішення (Влад)

- [x] `users` — написано як зразок (асистент)
- [x] `sessions` — id, userId (FK cascade), expiresAt, індекс `sessions_user_id_idx`
- [x] коментарі переписані з TODO на пояснення особливостей

Відкриті рішення, за Владом:

- [ ] **`sessions.createdAt` — потрібна колонка чи ні?** Прибирання мертвих
      сесій іде за `expiresAt`, тож для нього вона зайва. Єдиний сценарій —
      екран «активні пристрої» («Chrome, увійшов 3 дні тому, вийти»).
      Буде такий екран — додати, ні — це мертве поле.
- [ ] **Винести `uuid('id').primaryKey().default(sql`uuidv7()`)` у хелпер?**
      Дублювання вже двократне, а попереду `programs`, `workouts`, `exercises`,
      `sets`. Якщо виносити — тільки як ФУНКЦІЮ `const primaryId = () => ...`:
      константа шарила б один об'єкт-білдер між таблицями, а `.primaryKey()`
      його мутує.
- [ ] **Додати виведені типи** — знадобляться на кроці 4 замість `User`
      з `src/entities/`:
      ```ts
      export type User = typeof users.$inferSelect;    // що повертає SELECT
      export type NewUser = typeof users.$inferInsert;  // що приймає INSERT
      ```
      У `$inferInsert` поля з DEFAULT (`id`, `createdAt`) опційні, у
      `$inferSelect` — обов'язкові. Тип для вставки знає про дефолти.

### 3. Провайдер з'єднання — ЗРОБЛЕНО (асистент)

`src/db/db.module.ts`: пул `pg` + `drizzle()`, `@Global()`, токени-символи
`DRIZZLE` / `PG_POOL`, тип `Db`. `onModuleDestroy` закриває пул — інакше кожен
перезапуск у watch-режимі лишав би висіти з'єднання.

`src/config/env.validation.ts`: валідація оточення на старті через
class-validator, підключена в `ConfigModule.forRoot({ validate })`.

### 4. Auth під Drizzle — ЗРОБЛЕНО (асистент)

Зроблено разом із рештою сантехніки, бо без цього нічого не збиралося:

- `auth.service.ts`: `Repository` → `db.select()/insert()/delete()`, `eq()`
  з drizzle-orm. `.returning()` після INSERT — без нього не отримати id.
- `bcrypt` → `@node-rs/argon2` (`hash` / `verify`). `MaxLength(72)` прибрано —
  це було обмеження bcrypt.
- Попередню перевірку «чи існує email» прибрано: вона не давала гарантії,
  а UNIQUE від бази дає. Код `23505` шукається і на помилці, і в `.cause`,
  бо Drizzle загортає помилку драйвера.
- `findUserById` перелічує колонки явно — `passwordHash` не покидає сервіс.
  Раніше це робив `@Exclude` на сутності, але сутностей більше немає.
- `JwtPayload.sub` і `sessionId` — тепер `string` (uuid).
- `@Transform(value => value.trim().toLowerCase())` на email у обох DTO.
- `@ApiProperty` на полях DTO.
- `src/entities/` видалено.
- `auth.module.ts` експортує `AuthGuard` і `JwtModule` — знадобиться
  наступним модулям.

### 5. Обв'язка `main.ts` — ЗРОБЛЕНО (асистент)

`cookieParser()`, `ValidationPipe({ whitelist: true, transform: true })`,
CORS на `FRONTEND_URL` з `credentials: true`, Swagger на `/api`
(JSON — `/api/openapi.json`), порт із `ConfigService`.

Розширення `.js` дописані в усі відносні імпорти, `from 'src/...'` замінено
на відносні. `npm run build` проходить.

### 6. Міграція і перевірка — ЧЕКАЄ (разом)

- підняти Docker Desktop, `docker compose up -d`
- **перевірити `SELECT uuidv7();`** — функція має бути в Postgres 18,
  але на живій базі це ще не підтверджено. Якщо її немає: генерувати
  в застосунку пакетом `uuid`, дефолт із колонки прибрати.
- `npm run db:generate` → переглянути SQL → `npm run db:migrate`
- `npm run start:dev`, прогнати register / login / refresh / me / logout

---

## Крок 7. Програми — за Владом

Скелет зведено до того, що дає `nest g resource`: модуль, контролер,
сервіс, два DTO. Нічого більше. Таблиць програм у `src/db/schema.ts` теж
немає — їх проєктує Влад.

Моя версія (4 таблиці + повний контролер із гуардом, DTO з ApiProperty,
сервіс із сигнатурами) лежить у scratchpad сесії, каталог
`programs-my-version/`. Дістати можна, але тільки якщо Влад сам попросить
конкретний шматок — не підсовувати.

**Роль асистента далі: наштовхувати питаннями, не давати рішень.**
Верстка й стилі на фронті — виняток, як і раніше.

