import { ApiProperty } from '@nestjs/swagger';

export class DayExerciseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty({ format: 'uuid' })
  exerciseId: string;
  // Назва з каталогу — лише для показу, назад у тілі PUT не надсилається
  @ApiProperty()
  name: string;
  @ApiProperty()
  targetSets: number;
  @ApiProperty()
  targetReps: number;
}

export class ProgramDayResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty({ type: [DayExerciseResponseDto] })
  exercises: DayExerciseResponseDto[];
}

export class ProgramCoreDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  isActive: boolean;
}

export class ProgramListItemDto extends ProgramCoreDto {
  @ApiProperty()
  dayCount: number;
  @ApiProperty()
  exerciseCount: number;
}

export class ProgramResponseDto extends ProgramCoreDto {
  @ApiProperty({ type: [ProgramDayResponseDto] })
  days: ProgramDayResponseDto[];
}
