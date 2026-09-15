import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateProgramDayDto } from './create-program-day.dto.js';
import { Type } from 'class-transformer';

export class CreateProgramDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'UUIDv7, генерує клієнт. Захищає від дублікатів: повтор із тим самим id дає 409, а не другу програму',
  })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Push / Pull / Legs' })
  @IsString()
  @IsNotEmpty()
  name: string;

  // type: [X] обов'язковий саме для масивів — TypeScript у метаданих
  // лишає тільки Array, без інформації про елемент
  @ApiProperty({ type: [CreateProgramDayDto], minItems: 1 })
  // Валідатор за замовчуванням у вкладені об'єкти НЕ заходить: перевірив би,
  // що days це масив, і на цьому спинився. @ValidateNested каже зайти,
  // each: true — застосувати до кожного елемента, а не до масиву як цілого.
  @ValidateNested({ each: true })
  // Після JSON.parse у масиві звичайні об'єкти, а не екземпляри класу —
  // а правила валідації прив'язані до класу. @Type каже трансформеру
  // перетворити кожен елемент у CreateProgramDayDto, щоб було де їх узяти.
  // Без нього @ValidateNested мовчки не перевіряє нічого.
  @Type(() => CreateProgramDayDto)
  @IsArray()
  @ArrayMinSize(1)
  days: CreateProgramDayDto[];

  @ApiProperty({ description: 'Чи стає програма активною одразу' })
  @IsBoolean()
  isActive: boolean;
}
