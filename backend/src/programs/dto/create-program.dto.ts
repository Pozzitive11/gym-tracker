import { ValidateNested } from 'class-validator';
import { CreateProgramDayDto } from './create-program-day.dto.js';
import { Type } from 'class-transformer';

export class CreateProgramDto {
  id: string;

  name: string;

  @ValidateNested({ each: true })
  @Type(() => CreateProgramDayDto) // з class-transformer
  days: CreateProgramDayDto[];

  active: boolean;
}
