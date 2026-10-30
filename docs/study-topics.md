# Теми для вивчення

Кожна тема має питання для самоперевірки: якщо відповідаєш за 30 секунд без підглядання, тема закрита, став `[x]`.

## Теми

- [ ] **1. Глобальний `ValidationPipe`: як він знаходить DTO, який треба перевірити** (2026-09-26)
  Звідки пайп знає тип параметра, якщо типи TypeScript стираються при компіляції (`emitDecoratorMetadata`, `design:paramtypes`)? Які аргументи він пропускає без перевірки і чому (`toValidate`: примітиви, `Object`, кастомні декоратори)? Чому DTO мусить бути класом, а не `interface`, і чому `import type` для DTO мовчки вимикає валідацію? Чому глобальним не можна зробити `ParseUUIDPipe`, а `ValidationPipe` можна — і як через це `IdParamDto` валідує `:id` та описує його у Swagger з одного місця? Чим pipe відрізняється від guard, interceptor і middleware?
  Де дивитись: `backend/src/main.ts`, `backend/src/common/dto/id-param.dto.ts`, `dist/programs/programs.controller.js` (рядки `design:paramtypes`), `node_modules/@nestjs/common/pipes/validation.pipe.js` (`toValidate`).
- [ ] **2. Layout, page і template: що зберігає стан при навігації** (2026-09-26)
  Чим layout відрізняється від page, і що з них розмонтовується при переході між `/programs/X/edit` і `/programs/X/edit/days/0`? Чому форма живе в layout, а не в page? Коли layout таки перемонтовується (вихід з його папки, F5, інше значення `[id]`)? Для чого `template.tsx`? Навіщо route groups `(tabs)`, `(protected)` і приватні папки `_form`, і чому `programs/` не бачить таб-бар? Чим «не перемонтовується» відрізняється від «не перерендерюється»?
  Де дивитись: `frontend/src/app/(protected)/programs/[id]/edit/layout.tsx`, `programs/new/layout.tsx`, `(tabs)/layout.tsx`, `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`.
- [ ] **3. Чистий рендер, побічні ефекти й правила хуків** (2026-09-26)
  Чому рендер має бути чистим, і чому `router.replace` не можна викликати прямо в тілі компонента, а лише в `useEffect`? Навіщо `return null` на кадр до редіректу? Чому хуки не можна викликати після умовного `return`, і як поділ на «компонент, що перевіряє» і «компонент, що використовує» це обходить? Що таке залежності ефекту і для чого правило `exhaustive-deps`?
  Де дивитись: `frontend/src/app/(protected)/programs/_form/ProgramDayEditor.tsx` (`ProgramDayEditor` → `DayEditor`), `programs/[id]/edit/layout.tsx` (`EditProgramLayout` → `EditProgramForm`).
- [ ] **7. Гонки check-then-act і як їх закриває база** (2026-10-01)
  Чому «спершу перевірити, потім вставити» ламається при двох одночасних запитах? Як find-or-create спирається на унікальний індекс і `ON CONFLICT DO NOTHING`, а потім перечитує? Чому видалення порожнього тренування зроблене одним `DELETE … WHERE NOT EXISTS (…)`, а не двома запитами? Коли досить прийняти наслідок гонки (підхід у щойно завершеному тренуванні), а коли потрібна транзакція з `SELECT … FOR UPDATE`?
  Де дивитись: `backend/src/exercises/exercises.service.ts` (`findOrCreate`), `backend/src/workouts/workouts.service.ts` (`finish`, коментар над `addSet`).
- [ ] **8. Ідемпотентність і клієнтські id** (2026-10-01)
  Навіщо клієнт генерує `id` (UUIDv7, а не v4 — чому?), і чому його треба створити один раз у момент тапу, а не в `mutationFn`? Що бачить клієнт на повтор у `POST /programs` (409 → «успіх») і в `POST /workouts/:id/sets` (201 через `ON CONFLICT DO NOTHING`), і чим ці підходи відрізняються? Який метод HTTP ідемпотентний сам по собі (PUT), а який ні (POST)?
  Де дивитись: `frontend/src/lib/id.ts`, `frontend/src/lib/api/programs.ts`, `frontend/src/lib/api/workouts.ts` (`useAddSetMutation`), `backend/src/workouts/workouts.service.ts` (`addSet`).
- [ ] **9. IDOR / Broken Object Level Authorization** (2026-10-01)
  Чому зовнішній ключ не захищає від підставленого чужого `id`? Як працюють `countVisible`, `assertOwnedChildren` і пошук дня через `programs.user_id` у `start`? Чому на чужий і на неіснуючий об'єкт відповідь однакова? Навіщо перевіряти на бекенді те, що фронт і так не надішле?
  Де дивитись: `backend/src/exercises/exercises.service.ts` (`visibleTo`, `countVisible`), `backend/src/programs/programs.service.ts` (`assertExercisesVisible`, `assertOwnedChildren`), `backend/src/workouts/workouts.service.ts` (`start`, `addSet`).
- [ ] **10. Upsert і дифф замість «видалити все й вставити»** (2026-10-01)
  Чому повна заміна днів рвала звʼязок тренувань з днем (`ON DELETE SET NULL`)? Як працює `INSERT … ON CONFLICT (id) DO UPDATE` і псевдотаблиця `excluded`? Яку діру відкриває upsert по клієнтському `id`, і як її закриває перевірка «чи не належить id іншій програмі»?
  Де дивитись: `backend/src/programs/programs.service.ts` (`update`, `excluded`, `assertOwnedChildren`), артефакт «Схема даних трекера» (розділ «Редагування програми»).
- [ ] **14. Zustand: селектори, незмінність, `persist`** (2026-10-01)
  Навіщо селектор у `useWorkoutStore((s) => s.x)` і що він дає для перерендерів? Чому оновлення — це новий об'єкт, а не зміна старого (`unswapExercise`)? Як `persist` пише в `localStorage`, чому `Map` там мовчки губить дані, і навіщо подвійні дужки `create<T>()(...)`? Навіщо `workoutId` і `bindWorkout`?
  Де дивитись: `frontend/src/lib/workout/workout-store.ts`, `frontend/src/lib/auth/auth-store.ts`.
- [ ] **15. TanStack Query: кеш, інвалідація, оптимістичний UI** (2026-10-01)
  Як `staleTime` впливає на перезапит, і чому картка на головній не оновлювалась після зміни програми? Як працює інвалідація за префіксом ключа (`["workouts"]`) і що таке залежні запити? Чим оптимістичний UI через `useMutationState` відрізняється від ручного `onMutate` з відкатом? Що роблять `retry`, пауза мутації без мережі (`networkMode`) і `gcTime: Infinity`? Чому `setQueryData` має повертати новий об'єкт?
  Де дивитись: `frontend/src/lib/api/programs.ts` (`invalidateWorkoutQueries`), `frontend/src/lib/api/workouts.ts` (`useAddSetMutation`, `useUnsavedSets`), `frontend/src/app/providers.tsx`.
- [ ] **18. Міграції даних, а не лише схеми** (2026-10-01)
  Чому перехід `day_exercises.name → exercise_id` розбитий на три міграції (nullable колонка → перенесення даних → `NOT NULL`)? Навіщо `drizzle-kit generate --custom`, і чому системний каталог посіяний у міграції, а не окремим скриптом? Чому згенерований SQL не правлять руками?
  Де дивитись: `backend/drizzle/0002_*.sql`, `backend/drizzle/0003_seed_catalog_and_link_day_exercises.sql`, `backend/drizzle/0004_*.sql`.
- [ ] **19. DI у Nest: модулі, `exports` і `imports`** (2026-10-01)
  Чому `WorkoutsService` не бачив `ExercisesService`, поки `WorkoutsModule` не імпортував `ExercisesModule`, і що для цього мусить зробити сам `ExercisesModule`? Як Nest розвʼязує залежності конструктора? Навіщо `@Inject(DRIZZLE)` із символом, а не рядком?
  Де дивитись: `backend/src/workouts/workouts.module.ts`, `backend/src/exercises/exercises.module.ts`, `backend/src/db/db.module.ts`.
- [ ] **20. HTTP: як влаштований запит і відповідь** (2026-10-01)
  Що таке HTTP і на якому рівні він працює (поверх TCP)? З чого складається запит (метод, шлях, заголовки, тіло) і відповідь (статус, заголовки, тіло)? Що означає «HTTP не зберігає стан» (stateless), і як тоді сервер знає, хто ти (кука з refresh-токеном, заголовок `Authorization`)? Групи статус-кодів 1xx–5xx і чим відрізняються 400, 401, 403, 404, 409. Що таке CORS і чому браузер шле preflight `OPTIONS`?
  Де дивитись: вкладка Network у DevTools на будь-якому запиті до `localhost:3001`, `backend/src/main.ts` (`enableCors`), `backend/src/auth/auth.constants.ts` (кука).
- [ ] **21. REST: стиль API поверх HTTP і його правила** (2026-10-01)
  Чим REST відрізняється від HTTP (HTTP — протокол, REST — архітектурний стиль, що його використовує)? Ресурси й URL: чому `/programs/:id`, а не `/getProgram?id=`? Семантика методів: GET, POST, PUT, PATCH, DELETE — що з них безпечне, що ідемпотентне і чому це важливо для повторів? Чому `id` ресурсу в URL, а не в тілі PUT? Коли 200, 201, 204, і чому `GET /workouts/active` віддає 204, а не 404? Де наш API відступає від «чистого» REST (`POST /workouts/:id/finish` — дія, а не ресурс) і чи це погано? Що таке HATEOAS і чому його майже ніхто не робить?
  Де дивитись: `backend/src/programs/programs.controller.ts`, `backend/src/workouts/workouts.controller.ts`, `backend/src/programs/dto/update-program.dto.ts` (коментар про id в URL), Swagger на `localhost:3001/api`.
- [ ] **22. HTTP vs HTTPS: що додає TLS** (2026-10-01)
  Що саме шифрує HTTPS і від чого захищає (підслуховування, підміна, видавання себе за сервер)? Як працює TLS-рукостискання на рівні ідеї: асиметричні ключі для обміну, симетричний — для даних? Що таке сертифікат і хто його підписує (центр сертифікації, ланцюжок довіри)? Чому кука з refresh-токеном у проді має `secure: true`, а локально — ні? Що таке HSTS?
  Де дивитись: `backend/src/auth/auth.constants.ts` (`secure`), значок замка в адресному рядку → «Сертифікат».
- [ ] **23. WebSocket: коли HTTP-запиту мало** (2026-10-01)
  Чому в HTTP сервер не може сам написати клієнту, і як це обходять (polling, long polling, Server-Sent Events, WebSocket)? Як WebSocket стартує з HTTP-запиту (`Upgrade`) і чим потім відрізняється (одне постійне двостороннє зʼєднання)? Яка ціна: стан на сервері, масштабування на кілька інстансів, перепідключення. Чи потрібен WebSocket у нашому застосунку, і де він міг би знадобитись (тренування з двох пристроїв одночасно)?
  Де дивитись: вкладка Network → WS у DevTools на будь-якому чаті чи дашборді; для порівняння — як TanStack Query просто перезапитує дані (`staleTime`, інвалідація).
- [ ] **24. Event loop і асинхронна модель Node.js** (2026-10-01)
  Що таке V8 і libuv і хто з них за що відповідає? Блокуючий і неблокуючий ввід-вивід, шаблон «реактор». Як один потік JavaScript обслуговує тисячі запитів, і де все ж є пул потоків (libuv thread pool: файли, криптографія — наш argon2)? Фази event loop і черги: мікрозадачі (`Promise`, `queueMicrotask`) проти макрозадач (`setTimeout`, I/O, `setImmediate`), де `process.nextTick`. Що станеться із сервером, якщо в обробнику запиту крутити важкий синхронний цикл?
  Де дивитись: відео Ulbi TV «Node JS фундаментальный курс от А до Я», відрізок 14:00–33:11 — https://www.youtube.com/watch?v=243pQXC5Ebs&t=840s; `backend/src/auth/auth.service.ts` (`hash`/`verify` з argon2 — робота поза головним потоком).