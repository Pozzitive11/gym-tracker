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

// Вправа з плану дня — те, що екран тренування показує рядком чи панеллю
export class PlannedExerciseDto {
  @ApiProperty({ format: 'uuid', description: 'id рядка day_exercises' })
  id: string;
  @ApiProperty({ format: 'uuid' })
  exerciseId: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  targetSets: number;
  @ApiProperty()
  targetReps: number;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Вага останнього підходу цієї вправи в минулих тренуваннях',
  })
  lastWeight: number | null;
  @ApiProperty({ nullable: true, type: Number })
  lastReps: number | null;
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
  @ApiProperty({
    type: [PlannedExerciseDto],
    description:
      'План дня по порядку. Порожній, якщо день програми вже видалили',
  })
  exercises: PlannedExerciseDto[];
  @ApiProperty({ type: [WorkoutSetResponseDto] })
  sets: WorkoutSetResponseDto[];
}

export class NextWorkoutResponseDto {
  @ApiProperty({ format: 'uuid' })
  programDayId: string;
  @ApiProperty()
  dayName: string;
  @ApiProperty({ type: [String], description: 'Назви вправ дня по порядку' })
  exerciseNames: string[];
}
