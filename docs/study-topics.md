# Теми для вивчення

Кожна тема має питання для самоперевірки: якщо відповідаєш за 30 секунд без підглядання, тема закрита, став `[x]`.

## Теми

- [ ] **1. Глобальний `ValidationPipe`: як він знаходить DTO, який треба перевірити** (2026-09-26)
  Звідки пайп знає тип параметра, якщо типи TypeScript стираються при компіляції (`emitDecoratorMetadata`, `design:paramtypes`)? Які аргументи він пропускає без перевірки і чому (`toValidate`: примітиви, `Object`, кастомні декоратори)? Чому DTO мусить бути класом, а не `interface`, і чому `import type` для DTO мовчки вимикає валідацію? Чому глобальним не можна зробити `ParseUUIDPipe`, а `ValidationPipe` можна — і як через це `IdParamDto` валідує `:id` та описує його у Swagger з одного місця? Чим pipe відрізняється від guard, interceptor і middleware?
  Де дивитись: `backend/src/main.ts`, `backend/src/common/dto/id-param.dto.ts`, `dist/programs/programs.controller.js` (рядки `design:paramtypes`), `node_modules/@nestjs/common/pipes/validation.pipe.js` (`toValidate`).
