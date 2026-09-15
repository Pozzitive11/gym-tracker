import { OmitType } from '@nestjs/swagger';
import { CreateProgramDto } from './create-program.dto.js';

// Тіло PUT — те саме, що й на створення, але БЕЗ id.
//
// Ідентифікатор ресурсу в REST живе в URL: PUT /programs/:id. Якби id був
// ще й у тілі, він приходив би двічі — і довелося б вирішувати, що робити,
// коли вони не збігаються (мовчки взяти з URL? 400?). Питання, якого краще
// не мати взагалі.
//
// PartialType тут НЕ використовується свідомо: за домовленістю клієнт
// надсилає повний стан програми, а не набір змін. Опційні поля прямо
// суперечили б цьому.
//
// OmitType з @nestjs/swagger, а не з @nestjs/mapped-types: тільки він
// переносить @ApiProperty у новий клас. З mapped-types поля зникли б
// зі схеми OpenAPI, а разом з ними — з типів на фронті.
export class UpdateProgramDto extends OmitType(CreateProgramDto, [
  'id',
] as const) {}
