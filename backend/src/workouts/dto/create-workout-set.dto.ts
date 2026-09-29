import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateWorkoutSetDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'UUIDv7, генерує клієнт ОДИН раз у момент «підхід зроблено». Повтори запиту — з тим самим id',
  })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid', description: 'Вправа, яку реально зробили' })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({
    format: 'uuid',
    required: false,
    description: 'Вправа за планом, якщо її замінили. Нема — заміни не було',
  })
  @IsOptional()
  @IsUUID()
  plannedExerciseId?: string;

  // Межі дзеркалять numeric(6, 2) і CHECK у базі: помилка має прийти 400 з
  // людським текстом, а не 500 від Postgres на переповненні
  @ApiProperty({ example: 82.5, minimum: 0, maximum: 9999.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999.99)
  weight: number;

  @ApiProperty({ example: 8, minimum: 0 })
  @IsInt()
  @Min(0)
  reps: number;

  @ApiProperty({
    format: 'date-time',
    description: 'Коли підхід зроблено, час клієнта',
  })
  @IsISO8601()
  performedAt: string;
}
