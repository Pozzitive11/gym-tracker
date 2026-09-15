import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateDayExerciseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Присідання зі штангою' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5, minimum: 1, description: 'Цільові підходи' })
  @IsInt()
  @Min(1)
  targetSets: number;

  @ApiProperty({ example: 5, minimum: 1, description: 'Цільові повтори' })
  @IsInt()
  @Min(1)
  targetReps: number;
}
