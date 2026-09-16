# Frontend Auth (Login, Register, Token Handling) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login/register pages, a stub protected home page, and the
client-side infrastructure to hold an access token, attach it to API
requests, silently refresh it, and gate routes on session state.

**Architecture:** `accessToken` lives only in memory (Zustand store, readable
outside React via `getState()`), `refreshToken` stays a backend-managed
httpOnly cookie (unchanged). A single-flight `refreshAccessToken()` function
is called both on first load of any protected route and on any 401 response,
so concurrent callers share one network call. A `(protected)` route group
gates all authenticated pages behind session status; `(auth)/login` and
`(auth)/register` sit outside it.

**Tech Stack:** Next 16 App Router, React 19, Zustand 5, openapi-fetch 0.17,
react-hook-form 7 + zod 4 + @hookform/resolvers, Tailwind 4, NestJS 12 +
`@nestjs/swagger` (backend DTO addition only).

**Spec:** `docs/superpowers/specs/2026-09-16-frontend-auth-design.md`

## Global Constraints

- **ESM backend imports need `.js` extensions** even though files are `.ts`
  (`backend/CLAUDE.md`).
- **Never hand-write API response shapes on the frontend.** Types come from
  `frontend/src/lib/api/schema.d.ts`, regenerated via `npm run api:types`
  (`frontend/CLAUDE.md`). This is why Task 0 (backend response DTOs) blocks
  every later task that reads an auth response body.
- **Tailwind 4 config lives in `globals.css` via `@theme`**, not
  `tailwind.config.ts`. Use the existing tokens (`bg-surface`, `rounded-field`,
  `text-dim`, `bg-accent`, etc.) — don't invent new colors/radii.
- **Task ownership is per-task, not uniform.** Tasks marked `ВИКОНАВЕЦЬ:
  Влад` are the project owner's own work, per this project's standing
  front-end split (`CLAUDE.md`, root). **Do not dispatch these to a
  subagent.** The orchestrating session hands them to the user and waits for
  confirmation before starting any task that depends on them.
- No frontend test runner exists yet (only `eslint`/`tsc`). Verification
  per task is `npx tsc --noEmit` + `npm run lint`; end-to-end behavior is
  checked manually in the browser in the final task.

---

### Task 0: Backend — response DTO for auth endpoints

**ВИКОНАВЕЦЬ: Влад** (бекенд — не делегувати субагенту)

`auth.controller.ts` currently has no `@ApiResponse` on `register`, `login`,
`refresh` — the generated `schema.d.ts` shows `content?: never` for all
three (verified by reading the current schema). Every later frontend task
that reads `accessToken` off a response depends on this being fixed.

**Files:**
- Create: `backend/src/auth/dto/auth-response.dto.ts`
- Modify: `backend/src/auth/auth.controller.ts`

**What's needed** (matches the precedent in
`backend/src/programs/dto/program-response.dto.ts` +
`programs.controller.ts:41,47,54`):

- `AuthResponseDto` class with one `@ApiProperty()` field: `accessToken: string`
  — this is exactly the shape `AuthService.buildAuthResponse` and
  `AuthService.refresh` already return minus `refreshToken` (which never
  leaves the cookie).
- `@ApiResponse({ status: 201, type: AuthResponseDto })` on `register`,
  `login`, and `refresh` in `auth.controller.ts` (status 201 already matches
  what's in `schema.d.ts` — only the body `type` is missing, no behavior
  change).

**Steps:**

- [ ] Write `AuthResponseDto` in the new file, following the DTO style
      already used in `dto/register.dto.ts` / `dto/login.dto.ts` (class +
      `@ApiProperty`).
- [ ] Add the three `@ApiResponse` decorators to `auth.controller.ts`.
- [ ] Run: `cd backend && npm run build` — verify no TypeScript errors.
- [ ] With the backend running (`npm run start:dev`), regenerate the
      frontend schema: `cd frontend && npm run api:types`.
- [ ] Run: `git diff frontend/src/lib/api/schema.d.ts` — confirm
      `AuthController_register`, `AuthController_login`,
      `AuthController_refresh` now show `content: { "application/json":
      components["schemas"]["AuthResponseDto"] }` instead of `content?: never`.
- [ ] Commit (backend + regenerated schema together):

```bash
git add backend/src/auth/dto/auth-response.dto.ts backend/src/auth/auth.controller.ts frontend/src/lib/api/schema.d.ts
git commit -m "feat(auth): document access-token response shape for register/login/refresh"
```

**Tell the assistant when this is committed — every task below reads
`components["schemas"]["AuthResponseDto"]` from the regenerated schema.**

---

### Task 1: Zustand auth store

**Files:**
- Create: `frontend/src/lib/auth/auth-store.ts`

**Interfaces:**
- Produces: `useAuthStore` — a Zustand hook/store with state
  `{ accessToken: string | null; status: 'loading' | 'authenticated' |
  'unauthenticated' }` and actions `setAuthenticated(accessToken: string):
  void`, `setUnauthenticated(): void`. Read outside React via
  `useAuthStore.getState()`.

- [ ] **Step 1: Create the store**

```ts
import { create } from 'zustand';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  status: AuthStatus;
  setAuthenticated: (accessToken: string) => void;
  setUnauthenticated: () => void;
}

// accessToken живе тільки тут, у пам'яті — ніколи в localStorage чи куці.
// Причина в docs/superpowers/specs/2026-09-16-frontend-auth-design.md
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  status: 'loading',
  setAuthenticated: (accessToken) =>
    set({ accessToken, status: 'authenticated' }),
  setUnauthenticated: () => set({ accessToken: null, status: 'unauthenticated' }),
}));
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors mentioning `auth-store.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth/auth-store.ts
git commit -m "feat(frontend): add auth token store"
```

---

### Task 2: Single-flight token refresh

**Depends on:** Task 0 (committed), Task 1.

**Files:**
- Create: `frontend/src/lib/auth/refresh.ts`

**Interfaces:**
- Consumes: `useAuthStore` (`getState().setAuthenticated`,
  `getState().setUnauthenticated`) from Task 1; `components['schemas']
  ['AuthResponseDto']` from `frontend/src/lib/api/schema.d.ts` (Task 0).
- Produces: `refreshAccessToken(): Promise<string>` — resolves with the new
  access token, rejects if the refresh cookie is missing/expired. Safe to
  call concurrently from multiple places; only one network request fires.

- [ ] **Step 1: Write the module**

```ts
import { useAuthStore } from './auth-store';
import type { components } from '../api/schema';

type AuthResponse = components['schemas']['AuthResponseDto'];

// Не через lib/api/client.ts навмисно: якщо /auth/refresh сам поверне 401
// (кука прострочена), мідлвара клієнта спробувала б викликати
// refreshAccessToken() ще раз — а refreshPromise нижче вже чекає саме на
// цей виклик. Вийшов би дедлок. Тому — голий fetch, без мідлвари.
async function doRefreshCall(): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    { method: 'POST', credentials: 'include' },
  );

  if (!response.ok) {
    useAuthStore.getState().setUnauthenticated();
    throw new Error(`Refresh failed with status ${response.status}`);
  }

  const data = (await response.json()) as AuthResponse;
  useAuthStore.getState().setAuthenticated(data.accessToken);
  return data.accessToken;
}

let refreshPromise: Promise<string> | null = null;

// Single-flight: паралельні виклики (кілька 401 одночасно, або React
// StrictMode, що монтує ефекти двічі в dev) чекають на той самий запит
// замість того, щоб кожен стартував свій.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefreshCall().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. If `components['schemas']['AuthResponseDto']` doesn't
exist, Task 0's schema regeneration wasn't picked up — stop and check.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth/refresh.ts
git commit -m "feat(frontend): add single-flight access-token refresh"
```

---

### Task 3: Attach token and retry-on-401 in the API client

**Depends on:** Task 1, Task 2.

**Files:**
- Modify: `frontend/src/lib/api/client.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 1), `refreshAccessToken` (Task 2).
- Produces: the exported `api` client now attaches `Authorization: Bearer
  <token>` to every request and transparently retries once after a
  refresh on any 401 that isn't itself an auth endpoint.

- [ ] **Step 1: Add the middleware**

```ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { useAuthStore } from '../auth/auth-store';
import { refreshAccessToken } from '../auth/refresh';

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
});

// 401 тут means "expired access token" ТІЛЬКИ для звичайних ендпоінтів.
// На /auth/login 401 означає "невірний пароль" — рефрешити й повторювати
// такий запит безглуздо й лише замаскує реальну помилку.
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

function shouldSkipRetry(url: string): boolean {
  const { pathname } = new URL(url);
  return NO_RETRY_PATHS.some((path) => pathname.endsWith(path));
}

api.use({
  onRequest({ request }) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return request;
  },

  async onResponse({ request, response }) {
    if (response.status !== 401 || shouldSkipRetry(request.url)) {
      return response;
    }

    try {
      const newToken = await refreshAccessToken();
      const retryRequest = request.clone();
      retryRequest.headers.set('Authorization', `Bearer ${newToken}`);
      return await fetch(retryRequest);
    } catch {
      // Рефреш теж упав — сесія мертва. useAuthStore вже в
      // 'unauthenticated' (refresh.ts це виставив), (protected)/layout.tsx
      // відреагує редіректом сам, без додаткового коду тут.
      return response;
    }
  },
});
```

- [ ] **Step 2: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/client.ts
git commit -m "feat(frontend): attach access token and retry once on 401"
```

---

### Task 4: Protected route group with auth gate

**Depends on:** Task 1, Task 2.

**Files:**
- Create: `frontend/src/app/(protected)/layout.tsx`

**Interfaces:**
- Consumes: `useAuthStore` (Task 1), `refreshAccessToken` (Task 2).
- Produces: any route placed under `src/app/(protected)/` is rendered only
  when `status === 'authenticated'`; otherwise shows a loading state or
  redirects to `/login`. URL is unaffected by the group (Next.js route
  groups don't add a path segment).

- [ ] **Step 1: Write the gate**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/auth/auth-store';
import { refreshAccessToken } from '../../lib/auth/refresh';

export default function ProtectedLayout({ children }: LayoutProps<'/'>) {
  const status = useAuthStore((state) => state.status);
  const router = useRouter();

  useEffect(() => {
    refreshAccessToken().catch(() => {
      // помилку вже обробив refresh.ts (status -> 'unauthenticated');
      // тут ловимо лише щоб не було unhandled promise rejection
    });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="grid h-full w-full place-items-center bg-bg">
        <span className="text-body text-dim">Завантаження…</span>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. (`LayoutProps<'/'>` is a Next-generated global type —
same pattern already used in `src/app/layout.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/(protected)/layout.tsx"
git commit -m "feat(frontend): gate protected routes on auth status"
```

---

### Task 5: Move home page behind the gate as a stub

**Depends on:** Task 4.

**Files:**
- Create: `frontend/src/app/(protected)/page.tsx`
- Delete: `frontend/src/app/page.tsx`

Current `src/app/page.tsx` is a temporary design-tokens demo (its own
comment says "Видалити, коли з'явиться справжній головний екран") — this
replaces it with a real (if empty) home page, now behind the auth gate.

- [ ] **Step 1: Delete the old file**

```bash
git rm frontend/src/app/page.tsx
```

- [ ] **Step 2: Create the stub**

```tsx
export default function HomePage() {
  return (
    <div className="grid h-full w-full place-items-center px-6 text-center">
      <div>
        <p className="font-display text-[22px] font-bold tracking-title">
          Ти залогінений
        </p>
        <p className="mt-2 text-body text-dim">
          Головний екран ще в розробці.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify routing**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors, no duplicate-route complaints.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(protected)/page.tsx"
git commit -m "feat(frontend): replace design-tokens demo with home stub behind auth gate"
```

---

### Task 6: `LoginForm` presentational component

**Files:**
- Create: `frontend/src/app/(auth)/login/LoginForm.tsx`

This defines the props contract Task 7 (`useLoginForm.ts`, Влад) must
satisfy. It's a proposal — Влад can change field names if his hook logic
needs a different shape, as long as he keeps `LoginForm.tsx` in sync.

**Interfaces:**
- Produces: `LoginFormValues` (`{ email: string; password: string }`),
  `LoginFormProps`, `LoginForm` component.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from 'next/link';
import type {
  FormEventHandler,
  UseFormRegister,
  FieldErrors,
} from 'react-hook-form';

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormProps {
  register: UseFormRegister<LoginFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  errors: FieldErrors<LoginFormValues>;
  isSubmitting: boolean;
  submitError: string | null;
}

export function LoginForm({
  register,
  onSubmit,
  errors,
  isSubmitting,
  submitError,
}: LoginFormProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 pb-10">
      <p className="font-display text-[27px] font-extrabold tracking-display">
        Увійти
      </p>
      <p className="mt-2 mb-8 text-body text-dim">
        Продовж записувати тренування там, де зупинився.
      </p>

      {submitError && (
        <div className="mb-4 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
          {submitError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="login-email"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="h-[58px] w-full rounded-field bg-surface px-4 text-lead text-text outline-none focus:inset-ring-2 focus:inset-ring-accent"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-2 text-meta text-warn">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="login-password"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Пароль
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="h-[58px] w-full rounded-field bg-surface px-4 text-lead text-text outline-none focus:inset-ring-2 focus:inset-ring-accent"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-2 text-meta text-warn">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? 'Входимо…' : 'Увійти'}
        </button>
      </form>

      <p className="mt-6 text-center text-label text-dim">
        Немає акаунту?{' '}
        <Link href="/register" className="font-semibold text-accent">
          Зареєструватися
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors (this file alone won't fully resolve until Task 8 wires
it up, but it must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/(auth)/login/LoginForm.tsx"
git commit -m "feat(frontend): add LoginForm presentational component"
```

---

### Task 7: `useLoginForm` hook

**ВИКОНАВЕЦЬ: Влад** (форма — не делегувати субагенту)

**Depends on:** Task 6 (contract to satisfy), Task 0 (typed `api.POST`
response).

**Files:**
- Create: `frontend/src/app/(auth)/login/useLoginForm.ts`

**Must produce** a hook `useLoginForm(): LoginFormProps` (the exact type
from `LoginForm.tsx`, Task 6) that:

- Validates `email`/`password` with `zod` + `@hookform/resolvers/zod`,
  wired into `useForm` from `react-hook-form`. Mirror the backend's rules
  visible in `backend/src/auth/dto/login.dto.ts` (valid email format,
  non-empty password) — the backend is still the source of truth, this is
  just fail-fast UX.
- On submit, calls `api.POST('/auth/login', { body: { email, password } })`
  from `frontend/src/lib/api/client.ts`.
- On success, reads `accessToken` off the typed response and calls
  `useAuthStore.getState().setAuthenticated(accessToken)`, then navigates
  to `/` (`useRouter` from `next/navigation`).
- On failure, sets a `submitError` string surfaced to `LoginForm` (401 →
  "Невірний email або пароль", anything else → a generic message) instead
  of throwing.
- Returns exactly `{ register, onSubmit, errors, isSubmitting, submitError
  }` matching `LoginFormProps`. `onSubmit` should be the RHF-wrapped
  handler (`handleSubmit(yourSubmitFn)`), not the raw `handleSubmit`
  itself — `LoginForm` expects a ready `FormEventHandler`, it doesn't know
  about react-hook-form's currying.

- [ ] Implement `useLoginForm.ts`.
- [ ] Run: `cd frontend && npx tsc --noEmit && npm run lint`
- [ ] Commit:

```bash
git add "frontend/src/app/(auth)/login/useLoginForm.ts"
git commit -m "feat(frontend): implement login form validation and submit"
```

**Tell the assistant when this is committed — Task 8 wires it into the page.**

---

### Task 8: Wire the login page

**Depends on:** Task 6, Task 7 (committed).

**Files:**
- Create: `frontend/src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `useLoginForm()` from Task 7, `LoginForm` from Task 6.

- [ ] **Step 1: Write the page**

```tsx
'use client';

import { LoginForm } from './LoginForm';
import { useLoginForm } from './useLoginForm';

export default function LoginPage() {
  const form = useLoginForm();
  return <LoginForm {...form} />;
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors. If `useLoginForm`'s return type doesn't match
`LoginFormProps`, this is where it'll surface — fix in `useLoginForm.ts`,
not here.

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/(auth)/login/page.tsx"
git commit -m "feat(frontend): wire up /login page"
```

---

### Task 9: `RegisterForm` presentational component

**Files:**
- Create: `frontend/src/app/(auth)/register/RegisterForm.tsx`

Same shape as Task 6, different copy and route link. `RegisterDto`
(`backend/src/auth/dto/register.dto.ts`) has the same two fields as login
(`email`, `password`, min length 8) — no `confirmPassword` field, matching
the backend contract exactly rather than adding UI the backend doesn't ask
for.

**Interfaces:**
- Produces: `RegisterFormValues` (`{ email: string; password: string }`),
  `RegisterFormProps`, `RegisterForm` component.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from 'next/link';
import type {
  FormEventHandler,
  UseFormRegister,
  FieldErrors,
} from 'react-hook-form';

export interface RegisterFormValues {
  email: string;
  password: string;
}

export interface RegisterFormProps {
  register: UseFormRegister<RegisterFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  errors: FieldErrors<RegisterFormValues>;
  isSubmitting: boolean;
  submitError: string | null;
}

export function RegisterForm({
  register,
  onSubmit,
  errors,
  isSubmitting,
  submitError,
}: RegisterFormProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 pb-10">
      <p className="font-display text-[27px] font-extrabold tracking-display">
        Реєстрація
      </p>
      <p className="mt-2 mb-8 text-body text-dim">
        Один акаунт — програма вдома і підходи в залі синхронізовані.
      </p>

      {submitError && (
        <div className="mb-4 rounded-field bg-danger/10 px-4 py-3 text-label text-danger-soft">
          {submitError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="register-email"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            className="h-[58px] w-full rounded-field bg-surface px-4 text-lead text-text outline-none focus:inset-ring-2 focus:inset-ring-accent"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-2 text-meta text-warn">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="register-password"
            className="mb-2 block text-tag font-semibold tracking-kicker text-dim uppercase"
          >
            Пароль
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            className="h-[58px] w-full rounded-field bg-surface px-4 text-lead text-text outline-none focus:inset-ring-2 focus:inset-ring-accent"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-2 text-meta text-warn">
              {errors.password.message}
            </p>
          ) : (
            <p className="mt-2 text-meta text-dim">Щонайменше 8 символів</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[66px] w-full rounded-card bg-accent font-display text-lead font-bold text-accent-ink transition-transform duration-150 ease-out active:scale-[.975] disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? 'Створюємо…' : 'Зареєструватися'}
        </button>
      </form>

      <p className="mt-6 text-center text-label text-dim">
        Вже є акаунт?{' '}
        <Link href="/login" className="font-semibold text-accent">
          Увійти
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/(auth)/register/RegisterForm.tsx"
git commit -m "feat(frontend): add RegisterForm presentational component"
```

---

### Task 10: `useRegisterForm` hook

**ВИКОНАВЕЦЬ: Влад** (форма — не делегувати субагенту)

**Depends on:** Task 9 (contract to satisfy), Task 0.

**Files:**
- Create: `frontend/src/app/(auth)/register/useRegisterForm.ts`

Same requirements as Task 7, mirrored for register:

- Validate against the rules in `backend/src/auth/dto/register.dto.ts`
  (valid email, password ≥ 8 characters).
- Call `api.POST('/auth/register', { body: { email, password } })`.
- On success: `useAuthStore.getState().setAuthenticated(accessToken)`, then
  navigate to `/`.
- On failure: `submitError` — 409 (email taken) → "Такий email вже
  зареєстрований", anything else → generic message.
- Return shape matches `RegisterFormProps` exactly (`onSubmit` is the
  wrapped handler, not raw `handleSubmit`).

- [ ] Implement `useRegisterForm.ts`.
- [ ] Run: `cd frontend && npx tsc --noEmit && npm run lint`
- [ ] Commit:

```bash
git add "frontend/src/app/(auth)/register/useRegisterForm.ts"
git commit -m "feat(frontend): implement register form validation and submit"
```

**Tell the assistant when this is committed — Task 11 wires it into the page.**

---

### Task 11: Wire the register page

**Depends on:** Task 9, Task 10 (committed).

**Files:**
- Create: `frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';

import { RegisterForm } from './RegisterForm';
import { useRegisterForm } from './useRegisterForm';

export default function RegisterPage() {
  const form = useRegisterForm();
  return <RegisterForm {...form} />;
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/(auth)/register/page.tsx"
git commit -m "feat(frontend): wire up /register page"
```

---

### Task 12: End-to-end manual verification

**Depends on:** all previous tasks committed.

No frontend test runner exists, so this is a manual browser pass. Both
servers must be running:

```bash
docker compose up -d
cd backend && npm run start:dev
cd frontend && npm run dev
```

- [ ] Open `http://localhost:3000/` while logged out → redirected to
      `/login` (not a flash of the home stub).
- [ ] On `/register`, submit an existing/malformed email → inline
      validation error, no network call.
- [ ] Register a new account → redirected to `/` → home stub renders.
- [ ] Reload the page (`F5`) → still on `/`, no redirect to `/login` (the
      bootstrap refresh in `(protected)/layout.tsx` re-authenticates from
      the httpOnly cookie).
- [ ] Register with the same email again → `submitError` shows "Такий
      email вже зареєстрований", no navigation.
- [ ] Log out manually: in DevTools → Application → Cookies, delete
      `refreshToken` for `localhost:3001`. Reload `/` → redirected to
      `/login`.
- [ ] On `/login`, submit a wrong password → `submitError` shows "Невірний
      email або пароль".
- [ ] Log in with the correct credentials → redirected to `/`.
- [ ] In DevTools → Network, confirm requests to `/auth/*` (other than
      `/auth/login`/`/auth/register`) carry an `Authorization: Bearer …`
      header.
- [ ] No steps left unchecked above — if any fail, fix before considering
      this plan done.
