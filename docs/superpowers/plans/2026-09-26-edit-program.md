# Edit Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Редагування програми — той самий екран, що й створення, лише з
початковими даними з сервера і з PUT замість POST.

**Architecture:** Тіло форми і редактор дня виносяться в приватну папку
`programs/_form/` і параметризуються (`basePath`, тексти, `onSave`). Два
набори роутів — `programs/new/*` і `programs/[id]/edit/*` — відрізняються лише
layout-ом (звідки беруться `defaultValues`) і сторінкою (яку мутацію викликає
«Зберегти»). Форма редагування монтується лише тоді, коли дані програми вже в
кеші; після PUT відповідь сервера кладеться в кеш програми напряму.

**Tech Stack:** Next 16 App Router, React 19, react-hook-form 7 + zod 4,
TanStack Query 5, openapi-fetch; NestJS 12 (одна правка в контролері).

**Рішення, на яких це стоїть** (обговорено 2026-09-26):

1. Форма редагування монтується **після** завантаження даних — `defaultValues`
   читаються один раз; `reset()` і проп `values` відкинуті (стрибок форми,
   перезапис правок фоновим рефетчем).
2. Контракт бекенду не змінюється: PUT = повний стан, id програми — в URL.
   Потрібні два маппери: `toFormValues` (сервер → форма, відкидає `days[].name`)
   і `toUpdateProgramBody` (форма → тіло PUT, додає `days[].name`, без `id`).
3. Бекенд лишається на повній заміні дерева; фронт **зберігає серверні id**
   днів і вправ, не генерує нові. Розділення «план / факт» (каталог вправ,
   підходи посилаються на вправу, а не на рядок програми) — окрема задача,
   коли з'являться підходи.
4. PUT ідемпотентний — жодної обробки повторів, як 409 у створенні.
5. Після PUT: `setQueryData(["programs", id], відповідь)` + інвалідація
   лише списку `["programs"]` (`exact: true`).
   **Уточнено під час реалізації:** активація однієї програми знімає
   `isActive` з усіх інших, тож кеш **інших** програм теж застаріває. Бо
   форма монтується зі старого кешу, інвалідації мало — кеш інших програм
   видаляється (`removeQueries`), і після створення, і після оновлення
   (`evictProgramDetailsFromCache` у `programs.ts`).

**Поза межами:** кнопка «Видалити програму» (не вирішено), розділення
план/факт, захист від одночасного редагування з двох пристроїв (last write wins).

## Global Constraints

- **Нічого не комітити** — прохання власника проєкту для цієї задачі.
  Кроків «Commit» у плані нема.
- Тестового раннера на фронті нема. Перевірка: `npx tsc --noEmit` і
  `npm run lint` у `frontend/`; бекенд — `npm test` і `npm run lint` у `backend/`.
- Типи відповідей API — лише з `frontend/src/lib/api/schema.d.ts`, руками не
  писати.
- Next 16: `params` у серверних сторінках — `Promise`; у клієнтських
  компонентах — `useParams()`. Приватна папка `_name` виключена з роутингу
  (`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`).
- Файли переносити звичайним `mv`, не `git mv` — індекс git не чіпаємо.

## File Structure

```
frontend/src/app/(protected)/programs/
  _form/                          ← НОВЕ, приватна папка
    ProgramForm.tsx               ← тіло колишнього new/page.tsx, параметризоване
    ProgramDayEditor.tsx          ← тіло колишнього new/days/[index]/page.tsx
    program.schema.ts             ← + toFormValues, toUpdateProgramBody
    ActionBar.tsx, DayRow.tsx, ExerciseCard.tsx, ScreenHeader.tsx, SwitchRow.tsx  ← перенесені без змін
  new/
    layout.tsx                    ← лише шлях імпорту
    page.tsx                      ← тонка обгортка: useCreateProgram → ProgramForm
    days/[index]/page.tsx         ← тонка обгортка → ProgramDayEditor
  [id]/edit/                      ← НОВЕ
    layout.tsx                    ← useProgram → лоадер/помилка → useForm(toFormValues)
    page.tsx                      ← useUpdateProgram → ProgramForm
    days/[index]/page.tsx         ← → ProgramDayEditor
frontend/src/lib/api/programs.ts  ← + programQuery, useProgram, useUpdateProgram
frontend/src/app/(protected)/(tabs)/ProgramListItem.tsx  ← стає Link
frontend/src/app/(protected)/(tabs)/page.tsx             ← передає href
backend/src/programs/programs.controller.ts              ← ParseUUIDPipe на :id
```

---

### Task 1: Перенести спільне в `_form/`

**Files:**
- Move: `programs/new/{ActionBar,DayRow,ExerciseCard,ScreenHeader,SwitchRow}.tsx`, `programs/new/program.schema.ts` → `programs/_form/`
- Modify: `programs/new/layout.tsx` (імпорт)

- [ ] **Step 1: Перенести файли**

```bash
cd "frontend/src/app/(protected)/programs"
mkdir _form
mv new/ActionBar.tsx new/DayRow.tsx new/ExerciseCard.tsx new/ScreenHeader.tsx new/SwitchRow.tsx new/program.schema.ts _form/
```

- [ ] **Step 2: Оновити імпорт у `new/layout.tsx`**

```ts
import { programSchema, type ProgramFormValues } from "../_form/program.schema";
```

(Імпорти в `new/page.tsx` і `new/days/[index]/page.tsx` зникнуть разом із
тілом цих файлів у Task 3–4.)

### Task 2: Маппери в `program.schema.ts`

**Files:**
- Modify: `programs/_form/program.schema.ts` (кінець файлу, замість `toCreateProgramBody`)

- [ ] **Step 1: Замінити `toCreateProgramBody` трьома функціями**

```ts
type ProgramResponse = components["schemas"]["ProgramResponseDto"];

// Сервер → форма. Назву дня відкидаємо: у формі вона рахується з позиції.
// id днів і вправ — серверні, не нові: рядки лишаються тими самими
// сутностями, і перехід бекенду з повної заміни на дифф нічого не зламає
export function toFormValues(program: ProgramResponse): ProgramFormValues {
  return {
    id: program.id,
    name: program.name,
    isActive: program.isActive,
    days: program.days.map((day) => ({
      id: day.id,
      exercises: day.exercises.map(({ id, name, targetSets, targetReps }) => ({
        id,
        name,
        targetSets,
        targetReps,
      })),
    })),
  };
}

// Форма → тіло PUT. id програми живе в URL (PUT /programs/:id), тож у тілі
// його нема — інакше він приходив би двічі
export function toUpdateProgramBody(values: ProgramFormValues) {
  return {
    name: values.name,
    isActive: values.isActive,
    days: values.days.map((day, index) => ({
      id: day.id,
      name: dayLabel(index),
      exercises: day.exercises,
    })),
  };
}

// Створення — те саме плюс id: його генерує клієнт, тому повторний POST
// після загубленої відповіді впізнається бекендом (409)
export function toCreateProgramBody(values: ProgramFormValues) {
  return { id: values.id, ...toUpdateProgramBody(values) };
}
```

і імпорт угорі файлу:

```ts
import type { components } from "@/lib/api/schema";
```

- [ ] **Step 2:** `npx tsc --noEmit` у `frontend/` — очікувано лише помилки
  про ще не перенесені імпорти в `new/page.tsx` / `new/days/[index]/page.tsx`.

### Task 3: `ProgramForm` + тонка сторінка створення

**Files:**
- Create: `programs/_form/ProgramForm.tsx`
- Modify: `programs/new/page.tsx`

- [ ] **Step 1: `_form/ProgramForm.tsx`** — повний вміст колишнього
  `new/page.tsx` з такими змінами:
  - компонент `ProgramForm(props: ProgramFormProps)`, експорт іменований;
  - проп-контракт:
    ```ts
    interface ProgramFormProps {
      basePath: string;      // "/programs/new" | `/programs/${id}/edit`
      backHref: string;
      title: string;
      subtitle: string;
      submitLabel: string;
      // Кидає виняток при невдачі — повідомлення показує error
      onSave: (values: ProgramFormValues) => Promise<void>;
      error: string | null;
    }
    ```
  - `useCreateProgram`, `toCreateProgramBody`, `apiErrorText` звідси зникають;
  - `onSubmit`: `try { await onSave(values) } catch {}`;
  - `"/programs/new/days/…"` → `` `${basePath}/days/…` `` (у `addDay` і в `href` DayRow);
  - `ScreenHeader` бере `title` / `subtitle` / `backHref` з пропсів;
  - текст кнопки — `submitLabel`, під час відправки — «Зберігаємо…».

- [ ] **Step 2: `new/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCreateProgram } from "@/lib/api/programs";
import { apiErrorText } from "@/lib/api/unwrap";
import { ProgramForm } from "../_form/ProgramForm";
import { toCreateProgramBody } from "../_form/program.schema";

export default function NewProgramPage() {
  const router = useRouter();
  const createProgram = useCreateProgram();

  return (
    <ProgramForm
      basePath="/programs/new"
      backHref="/"
      title="Нова програма"
      subtitle="Налаштуй один раз, далі тільки тренуйся"
      submitLabel="Зберегти програму"
      error={
        createProgram.error
          ? `Не вдалося зберегти програму. ${apiErrorText(createProgram.error)}`
          : null
      }
      onSave={async (values) => {
        await createProgram.mutateAsync(toCreateProgramBody(values));
        router.push("/");
      }}
    />
  );
}
```

### Task 4: `ProgramDayEditor` + тонка сторінка дня

**Files:**
- Create: `programs/_form/ProgramDayEditor.tsx`
- Modify: `programs/new/days/[index]/page.tsx`

- [ ] **Step 1: `_form/ProgramDayEditor.tsx`** — повний вміст колишнього
  `new/days/[index]/page.tsx` з такими змінами:
  - `export function ProgramDayEditor({ basePath }: { basePath: string })`
    замість `default export DayEditorPage`;
  - `basePath` прокидається у внутрішній `DayEditor` (`{ index, basePath }`);
  - три входження `"/programs/new"` (`router.replace`, `router.push`,
    `backHref`) → `basePath`;
  - імпорти сусідів — `./ActionBar`, `./ExerciseCard`, `./ScreenHeader`,
    `./program.schema`.

- [ ] **Step 2: `new/days/[index]/page.tsx`**

```tsx
import { ProgramDayEditor } from "../../../_form/ProgramDayEditor";

export default function NewProgramDayPage() {
  return <ProgramDayEditor basePath="/programs/new" />;
}
```

- [ ] **Step 3:** `npx tsc --noEmit` і `npm run lint` у `frontend/` — чисто.
  Створення програми працює як раніше (регресія рефакторингу).

### Task 5: Запит однієї програми і мутація оновлення

**Files:**
- Modify: `frontend/src/lib/api/programs.ts`

- [ ] **Step 1: Додати**

```ts
type UpdateProgramBody = components["schemas"]["UpdateProgramDto"];

// Ключ ["programs", id] — під префіксом списку. invalidateQueries(["programs"])
// без exact зачепив би й його
export const programQuery = (id: string) =>
  queryOptions({
    queryKey: ["programs", id],
    queryFn: async () =>
      unwrap(await api.GET("/programs/{id}", { params: { path: { id } } })),
  });

export function useProgram(id: string) {
  return useQuery(programQuery(id));
}

export function useUpdateProgram(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // PUT ідемпотентний: повтор після загубленої відповіді ставить той самий
    // стан — окремої обробки, як 409 у створенні, не треба
    mutationFn: async (body: UpdateProgramBody) =>
      unwrap(
        await api.PUT("/programs/{id}", { params: { path: { id } }, body }),
      ),
    onSuccess: (program) => {
      // Форма редагування бере defaultValues один раз, при монтуванні. Якби
      // тут була лише інвалідація, наступне відкриття показало б старий кеш,
      // а свіжі дані прийшли б, коли форма їх уже не читає. PUT повертає
      // свіже дерево — кладемо його в кеш напряму
      queryClient.setQueryData(programQuery(id).queryKey, program);
      // Список лише позначаємо застарілим: змінились назва, к-сть днів/вправ.
      // exact — щоб не зачепити щойно покладену програму зайвим рефетчем
      return queryClient.invalidateQueries({
        queryKey: programsQuery.queryKey,
        exact: true,
      });
    },
  });
}
```

### Task 6: Роути редагування

**Files:**
- Create: `programs/[id]/edit/layout.tsx`, `programs/[id]/edit/page.tsx`, `programs/[id]/edit/days/[index]/page.tsx`

- [ ] **Step 1: `[id]/edit/layout.tsx`**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useProgram } from "@/lib/api/programs";
import type { components } from "@/lib/api/schema";
import { ApiError } from "@/lib/api/unwrap";
import {
  programSchema,
  toFormValues,
  type ProgramFormValues,
} from "../../_form/program.schema";

export default function EditProgramLayout({
  children,
}: LayoutProps<"/programs/[id]/edit">) {
  const { id } = useParams<{ id: string }>();
  const { data: program, isPending, error, refetch } = useProgram(id);

  // Спершу дані, потім помилка: якщо фоновий рефетч (фокус вкладки) впаде
  // посеред редагування, status стане error, але data лишиться — форму з
  // правками юзера не розмонтовуємо
  if (program) {
    return (
      <EditProgramForm key={program.id} program={program}>
        {children}
      </EditProgramForm>
    );
  }
  if (isPending) return <Loading />;
  const notFound =
    error instanceof ApiError && (error.status === 404 || error.status === 400);
  return <LoadError notFound={notFound} onRetry={() => refetch()} />;
}

// Окремий компонент, щоб useForm викликався лише тоді, коли дані вже є:
// defaultValues читаються один раз, на першому рендері
function EditProgramForm({ program, children }: { program: components["schemas"]["ProgramResponseDto"]; children: ReactNode }) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: toFormValues(program),
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}
```
плюс `Loading` і `LoadError` (розмітка, асистент).

- [ ] **Step 2: `[id]/edit/page.tsx`**

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useProgram, useUpdateProgram } from "@/lib/api/programs";
import { apiErrorText } from "@/lib/api/unwrap";
import { ProgramForm } from "../../_form/ProgramForm";
import { toUpdateProgramBody } from "../../_form/program.schema";

export default function EditProgramPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: program } = useProgram(id);
  const updateProgram = useUpdateProgram(id);

  return (
    <ProgramForm
      basePath={`/programs/${id}/edit`}
      backHref="/"
      title="Редагування"
      subtitle={program?.name ?? ""}
      submitLabel="Зберегти зміни"
      error={
        updateProgram.error
          ? `Не вдалося зберегти зміни. ${apiErrorText(updateProgram.error)}`
          : null
      }
      onSave={async (values) => {
        await updateProgram.mutateAsync(toUpdateProgramBody(values));
        router.push("/");
      }}
    />
  );
}
```

- [ ] **Step 3: `[id]/edit/days/[index]/page.tsx`**

```tsx
import { ProgramDayEditor } from "../../../../_form/ProgramDayEditor";

export default async function EditProgramDayPage({
  params,
}: PageProps<"/programs/[id]/edit/days/[index]">) {
  const { id } = await params;
  return <ProgramDayEditor basePath={`/programs/${id}/edit`} />;
}
```

### Task 7: Вхід у редагування з головної

**Files:**
- Modify: `(tabs)/ProgramListItem.tsx`, `(tabs)/page.tsx`

- [ ] **Step 1:** `ProgramListItem` приймає `href: string`, корінь — `Link`
  замість `div`, додається шеврон і `active:scale` (розмітка, асистент).
- [ ] **Step 2:** `(tabs)/page.tsx` передає `href={`/programs/${program.id}/edit`}`.

### Task 8: Бекенд — 400 замість 500 на невалідний id

**Files:**
- Modify: `backend/src/programs/programs.controller.ts`

- [ ] **Step 1:** `@Param('id', ParseUUIDPipe) id: string` у `findOne`,
  `update`, `remove`; `ParseUUIDPipe` в імпорт з `@nestjs/common`.
  Без цього `GET /programs/abc` доходить до Postgres, той падає на касті в
  `uuid`, і клієнт отримує 500. З пайпом — 400 на межі.
- [ ] **Step 2:** `npm run lint` і `npm test` у `backend/` — зелене.

### Task 9: Перевірка

- [ ] `frontend/`: `npx tsc --noEmit`, `npm run lint` — чисто.
- [ ] Бек: `curl` — зареєструватися, створити програму (POST), `GET /programs/:id`,
  `PUT` зі зміненою назвою → 200 і нове дерево; `GET /programs/abc` → 400.
- [ ] Браузер: головна → тап по програмі → форма з даними; змінити назву,
  додати вправу в день → «Зберегти зміни» → головна показує нову назву →
  знову відкрити → форма з новими даними (перевірка п. 5). Створення нової
  програми працює як раніше.
