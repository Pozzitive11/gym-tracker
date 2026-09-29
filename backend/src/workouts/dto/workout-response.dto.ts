import { ApiProperty } from '@nestjs/swagger';

export class WorkoutSetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty({ format: 'uuid' })
  exerciseId: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  plannedExerciseId: string | null;
  @ApiProperty()
  weight: number;
  @ApiProperty()
  reps: number;
  @ApiProperty({ format: 'date-time' })
  performedAt: Date;
}

export class ActiveWorkoutResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  programDayId: string | null;
  @ApiProperty()
  dayName: string;
  @ApiProperty({ format: 'date-time' })
  startedAt: Date;
  @ApiProperty({ type: [WorkoutSetResponseDto] })
  sets: WorkoutSetResponseDto[];
}
