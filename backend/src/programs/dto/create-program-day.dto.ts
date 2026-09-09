import { ValidateNested } from 'class-validator';
import { CreateExerciseDto } from './create-exercise.dto.js';
import { Type } from 'class-transformer';

export class CreateProgramDayDto {
  id: string;
  name: string;

  // каже перевірити що всередині масиву
  @ValidateNested({ each: true })

  // каже на що саме перевіряти
  @Type(() => CreateExerciseDto)
  exercises: CreateExerciseDto[];
}
