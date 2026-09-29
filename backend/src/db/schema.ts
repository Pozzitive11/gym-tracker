import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
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

// Каталог вправ. Статистика будується по exercises.id, а не по назві: так
// «Жим лежачи» в двох різних програмах — одна лінія на графіку.
//
// userId розділяє каталог на два шари в одній таблиці:
//   NULL      — системна вправа, спільна для всіх (сід у міграції);
//   заповнений — «моя»: вписана вручну, бачить лише автор.
// Окрема таблиця під «мої» дала б два джерела, на які мусили б посилатися
// і програми, і підходи — зовнішній ключ не вміє вказувати «на одну з двох».
export const exercises = pgTable(
  'exercises',
  {
    id: primaryId(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('exercises_user_id_idx').on(table.userId),

    // Дубль назви в межах одного шару заборонений, і без огляду на регістр:
    // «Жим лежачи» і «жим лежачи» — та сама вправа. Індекс по виразу
    // lower(name), а не по самій колонці — саме тому.
    //
    // Два часткові індекси, а не один на (user_id, lower(name)): у
    // звичайному UNIQUE два NULL вважаються різними, і системні вправи з
    // однаковою назвою пройшли б обидві
    uniqueIndex('exercises_system_name_unique')
      .on(sql`lower(${table.name})`)
      .where(sql`${table.userId} is null`),
    uniqueIndex('exercises_user_name_unique')
      .on(table.userId, sql`lower(${table.name})`)
      .where(sql`${table.userId} is not null`),
  ],
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
    // Посилання на каталог замість вільного тексту назви: тоді «Жим лежачи»
    // з різних програм і з підходів — одна й та сама вправа для статистики.
    // Без onDelete (NO ACTION): вправу, що стоїть у програмі, не видалити
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    targetSets: integer('target_sets').notNull(),
    targetReps: integer('target_reps').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    index('day_exercises_day_id_idx').on(table.dayId),
    index('day_exercises_exercise_id_idx').on(table.exerciseId),
  ],
);

// Одне тренування — один похід у зал.
export const workouts = pgTable(
  'workouts',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Звідки взялось тренування. set null, а не cascade: видалили день чи
    // всю програму — історія тренувань лишається, просто без посилання
    programDayId: uuid('program_day_id').references(() => programDays.id, {
      onDelete: 'set null',
    }),

    // Знімок назви дня на момент тренування. Потрібен саме через set null
    // вище: коли посилання обнулиться, історія все одно покаже «День A»
    dayName: text('day_name').notNull(),

    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // NULL — тренування ще триває (або його кинули, не завершивши)
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [
    index('workouts_user_id_idx').on(table.userId),
    // під ON DELETE SET NULL: база шукає тренування видаленого дня
    index('workouts_program_day_id_idx').on(table.programDayId),
  ],
);

// Один підхід — один рядок. Уся статистика (графіки ваги, обʼєм, рекорди)
// — це запити по цій таблиці, окремих таблиць зі статистикою немає.
//
// Посилання на вправи без onDelete, тобто NO ACTION: вправу, по якій уже є
// підходи, видалити не можна — інакше разом з нею зникла б історія.
//
// Пастка: через це й каскад від users сам по собі НЕ спрацьовує. Кожен
// крок каскаду — окрема внутрішня операція, і NO ACTION перевіряється в
// кінці кожної, а не всього DELETE. Каскад видаляє власні вправи юзера
// раніше за його підходи, і база відмовляє. Тому видалення акаунта йде по
// черзі в транзакції — див. AuthService.deleteAccount.
export const workoutSets = pgTable(
  'workout_sets',
  {
    // Генерує клієнт у момент натискання «зроблено». Повтор запиту приходить
    // з тим самим id — так сервер відрізняє повтор від нового підходу
    id: primaryId(),
    workoutId: uuid('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),

    // Вправа, яку реально зробили
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    // Вправа за планом, якщо її замінили посеред тренування. NULL — заміни
    // не було. Звідси в історії підпис «замість: …»
    plannedExerciseId: uuid('planned_exercise_id').references(
      () => exercises.id,
    ),

    // numeric, а не real: real — двійкове число з плаваючою комою, в ньому
    // 0.1 + 0.2 ≠ 0.3, і рекорд «85 > 84.99999» почав би брехати. numeric
    // зберігає десяткові цифри точно. (6, 2) — до 9999.99 кг, два знаки
    // після коми вистачить і на 0.25 кг.
    //
    // mode: 'number' — драйвер pg віддає numeric рядком (бо JS-число не
    // вміщає довільну точність). Для ваги до 9999.99 точність number
    // достатня, тож хай Drizzle конвертує сам
    weight: numeric('weight', {
      precision: 6,
      scale: 2,
      mode: 'number',
    }).notNull(),
    reps: integer('reps').notNull(),

    // Коли підхід зроблено — клієнтський час, не час вставки. Зараз вони
    // майже збігаються, але з офлайн-чергою підхід може доїхати на сервер
    // через годину, а на графіку має стояти тоді, коли його зробили
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('workout_sets_workout_id_idx').on(table.workoutId),
    index('workout_sets_exercise_id_idx').on(table.exerciseId),
    index('workout_sets_planned_exercise_id_idx').on(table.plannedExerciseId),
    // Останній рубіж від сміття: DTO це теж перевіряє, але обійти DTO
    // можна (новий ендпоінт, ручний SQL), а CHECK у базі — ні
    check('workout_sets_weight_non_negative', sql`${table.weight} >= 0`),
    check('workout_sets_reps_non_negative', sql`${table.reps} >= 0`),
  ],
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
export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
