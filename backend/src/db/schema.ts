import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Один об'єкт-описувач читають двоє: drizzle-kit (щоб згенерувати міграцію)
// і рантайм (щоб вивести типи запитів). Джерело правди — цей файл.
// Тому SQL у згенерованих міграціях руками не правлять: наступний generate
// звірить базу зі схемою і відкотить правку назад.

// Той самий первинний ключ повторюється в кожній таблиці. Саме функція,
// а не константа: uuid('id') створює об'єкт-білдер, і .primaryKey() його
// мутує — одна константа шарилась би між усіма таблицями.
const primaryId = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);

export const users = pgTable('users', {
  // Ключ зліва — назва поля в TS, рядок у дужках — назва колонки в SQL.
  // Дві різні назви навмисно: у коді хочеться camelCase, у SQL стандарт —
  // snake_case, інакше в кожному ручному запиті довелося б писати "passwordHash"
  // у лапках, бо Postgres без них згортає ідентифікатори в нижній регістр.
  id: primaryId(),

  // UNIQUE у Postgres порівнює байти, а не сенс: 'vlad@mail.com' і
  // 'Vlad@Mail.com' для нього різні рядки і обидва пройдуть. Тому регістр
  // зводиться до нижнього на межі системи — у DTO через @Transform, до того
  // як значення сюди дійде. Гарантію на рівні бази дав би унікальний індекс
  // по виразу lower(email), але тоді й шукати довелось би через lower().
  email: text('email').notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  // withTimezone — назва оманлива: таймзона НЕ зберігається. Зберігається
  // момент часу в UTC (8 байт), а таймзона потрібна лише як контекст при
  // конвертації на вході й виході. Без неї колонка тримала б показ годинника
  // без прив'язки: запис із Києва і запис із Франкфурта, зроблені в ту саму
  // секунду, лягли б різними значеннями й порівнювати їх було б безглуздо.
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: primaryId(),

    // Стрілка навколо users.id обов'язкова. Без неї це було б звернення до
    // users у момент, коли модуль ще виконується згори вниз — спрацювало б
    // лише тому, що users оголошений вище. Стрілка відкладає читання до
    // моменту, коли обидві таблиці вже існують, і знімає залежність від
    // порядку оголошень у файлі.
    //
    // onDelete: 'cascade' лягає в DDL як ON DELETE CASCADE — видаляє САМА
    // база. У TypeORM був ще й застосунковий каскад (вантажив зв'язані
    // сутності в пам'ять і видаляв по одній); у Drizzle такого немає взагалі,
    // тож місце, де це відбувається, рівно одне.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Без дефолту свідомо: значення рахує сервіс як Date.now() + REFRESH_TTL_MS,
    // з тієї самої константи, з якої виводяться expiresIn токена і maxAge куки.
    // Дефолт у базі був би четвертим джерелом того самого числа.
    //
    // Ця колонка — те, що робить сесію відкличною (stateful). Підпис і exp
    // усередині токена зафіксовані в момент видачі й скасувати їх неможливо;
    // рядок у таблиці — можна. Вона ж дає прибиральнику ознаку, за якою
    // шукати мертві рядки: без неї таблиця росла б нескінченно, бо сам рядок
    // не знає нічого про власне життя.
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  // Другий аргумент pgTable — індекси й обмеження рівня таблиці.
  //
  // Індекс тут не заради SELECT: сесії шукаються за первинним ключем, під
  // яким індекс уже є. Він заради ON DELETE CASCADE — щоб видалити юзера,
  // Postgres мусить знайти всі його сесії за user_id, і без індексу це
  // послідовне сканування всієї таблиці на кожне видалення акаунта.
  //
  // Пастка: Postgres НЕ створює індекс під зовнішній ключ автоматично.
  // MySQL/InnoDB створює — звідси й поширене хибне «у нас же FK, індекс є».
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const programs = pgTable(
  'programs',
  {
    id: primaryId(),

    // Зовнішній ключ — це звичайна колонка того самого типу, що й ключ
    // батька (uuid), плюс .references() на неї. Окремого типу «foreignKey»
    // немає: у SQL це обмеження на колонку, а не тип даних
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),

    // notNull + default обов'язкові разом. Без notNull з'явився б третій
    // стан — NULL, тобто «невідомо, активна вона чи ні». Такого стану в
    // предметній області немає, а перевіряти його довелося б у кожному запиті
    isActive: boolean('is_active').notNull().default(false),

    // Потрібен не для звітності, а щоб було за чим сортувати список програм
    // на головній: активна зверху, решта — найновіші першими. Без цієї
    // колонки порядок віддає база на власний розсуд і змінюється сам собою.
    //
    // У program_days і day_exercises такого поля свідомо немає: кожне
    // збереження програми видаляє їх і вставляє заново, тож дата показувала б
    // не «коли створено день», а «коли востаннє зберігали програму»
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('programs_user_id_idx').on(table.userId),

    // ЧАСТКОВИЙ унікальний індекс: .where() звужує його дію до рядків, де
    // is_active = true. Виходить «унікальний user_id серед активних», тобто
    // друга активна програма того самого юзера просто не вставиться.
    //
    // Гарантію дає база, а не код сервісу. Різниця в тому, що код можна
    // обійти — забути перевірку в новому методі, зайти двома запитами
    // одночасно. Обмеження в базі обійти не можна.
    //
    // Ціна: активація стає транзакцією (зняти прапорець зі старої, поставити
    // на нову), бо в проміжку між двома UPDATE активних було б дві
    uniqueIndex('programs_one_active_per_user')
      .on(table.userId)
      .where(sql`${table.isActive}`),
  ],
);

export const programDays = pgTable(
  'program_days',
  {
    id: primaryId(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('program_days_program_id_idx').on(table.programId)],
);

export const dayExercises = pgTable(
  'day_exercises',
  {
    id: primaryId(),
    dayId: uuid('day_id')
      .notNull()
      .references(() => programDays.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    targetSets: integer('target_sets').notNull(),
    targetReps: integer('target_reps').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('day_exercises_day_id_idx').on(table.dayId)],
);

// Типи виводяться зі схеми, руками не пишуться. Різниця не косметична:
// в $inferInsert поля з DEFAULT (id, createdAt) опційні, в $inferSelect —
// обов'язкові, бо база їх завжди поверне.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type ProgramDay = typeof programDays.$inferSelect;
export type NewProgramDay = typeof programDays.$inferInsert;
export type DayExercise = typeof dayExercises.$inferSelect;
export type NewDayExercise = typeof dayExercises.$inferInsert;
