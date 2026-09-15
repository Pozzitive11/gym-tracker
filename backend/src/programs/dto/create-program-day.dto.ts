import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateDayExerciseDto } from './create-day-exercise.dto.js';
import { Type } from 'class-transformer';

export class CreateProgramDayDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'День A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  // type: [X] обов'язковий для масивів — у метаданих TypeScript лишає
  // тільки Array, без інформації про елемент
  @ApiProperty({ type: [CreateDayExerciseDto], minItems: 1 })
  // Валідатор за замовчуванням у вкладені об'єкти НЕ заходить: перевірив би,
  // що exercises це масив, і на цьому спинився. @ValidateNested каже зайти,
  // each: true — застосувати до кожного елемента, а не до масиву як цілого.
  @ValidateNested({ each: true })
  // Після JSON.parse у масиві звичайні об'єкти, а не екземпляри класу —
  // а правила валідації прив'язані до класу. @Type каже трансформеру
  // перетворити кожен елемент у CreateDayExerciseDto, щоб було де їх узяти.
  // Без нього @ValidateNested мовчки не перевіряє нічого.
  @Type(() => CreateDayExerciseDto)
  @IsArray()
  @ArrayMinSize(1)
  exercises: CreateDayExerciseDto[];
}
