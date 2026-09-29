import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'UUIDv7, генерує клієнт. Використовується, лише якщо вправи з такою назвою ще нема',
  })
  @IsUUID()
  id: string;

  // trim на межі: « Жим » і «Жим» не мають стати двома вправами
  @ApiProperty({ example: 'Жим у Сміті' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
