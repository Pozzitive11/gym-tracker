import { ApiProperty } from '@nestjs/swagger';

export class DayExerciseResponseDto {
  @ApiProperty({ format: 'uuid' }) 
  id: string;
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

export class ProgramListItemDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() isActive: boolean;
}

export class ProgramResponseDto extends ProgramListItemDto {
  @ApiProperty({ type: [ProgramDayResponseDto] })
  days: ProgramDayResponseDto[];
}
