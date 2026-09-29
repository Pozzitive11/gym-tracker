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
