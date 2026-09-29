import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { DRIZZLE, type Db } from '../db/db.module.js';
import { programDays, programs, workouts, workoutSets } from '../db/schema.js';
import type { CreateWorkoutSetDto } from './dto/create-workout-set.dto.js';
import type { StartWorkoutDto } from './dto/start-workout.dto.js';

@Injectable()
export class WorkoutsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async start(user: JwtPayload, dto: StartWorkoutDto) {
    // День шукаємо через програму, бо власник записаний саме там. Чужий
    // день для нас не існує — та сама відповідь, що й для неіснуючого
    const [day] = await this.db
      .select({ name: programDays.name })
      .from(programDays)
      .innerJoin(programs, eq(programs.id, programDays.programId))
      .where(
        and(
          eq(programDays.id, dto.programDayId),
          eq(programs.userId, user.sub),
        ),
      );

    if (!day) throw new BadRequestException('День програми не знайдено');

    await this.db.insert(workouts).values({
      id: dto.id,
      userId: user.sub,
      programDayId: dto.programDayId,
      dayName: day.name,
    });
  }

  // Активне — останнє незавершене. Кинуті незавершені тренування лишаються
  // в базі, але екран тренування відкриває найсвіжіше
  async findActive(user: JwtPayload) {
    const [workout] = await this.db
      .select({
        id: workouts.id,
        programDayId: workouts.programDayId,
        dayName: workouts.dayName,
        startedAt: workouts.startedAt,
      })
      .from(workouts)
      .where(and(eq(workouts.userId, user.sub), isNull(workouts.finishedAt)))
      .orderBy(desc(workouts.startedAt))
      .limit(1);

    if (!workout) return null;

    const sets = await this.db
      .select({
        id: workoutSets.id,
        exerciseId: workoutSets.exerciseId,
        plannedExerciseId: workoutSets.plannedExerciseId,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        performedAt: workoutSets.performedAt,
      })
      .from(workoutSets)
      .where(eq(workoutSets.workoutId, workout.id))
      .orderBy(asc(workoutSets.performedAt));

    return { ...workout, sets };
  }

  async finish(user: JwtPayload, id: string) {
    const [finished] = await this.db
      .update(workouts)
      .set({ finishedAt: new Date() })
      .where(
        and(
          eq(workouts.id, id),
          eq(workouts.userId, user.sub),
          isNull(workouts.finishedAt),
        ),
      )
      .returning({ id: workouts.id });

    if (!finished) throw new NotFoundException();
  }

  // TODO(Влад): крок 7 плану — запис одного підходу.
  //
  // Що має зробити цей метод:
  //   1. Переконатись, що тренування workoutId належить user.sub і ще не
  //      завершене. Що повернути, якщо ні? (подивись, як це зроблено в finish)
  //   2. Переконатись, що exerciseId і plannedExerciseId доступні юзеру.
  //      Підказка: ExercisesService.countVisible уже є, треба лише
  //      підключити ExercisesModule у workouts.module.ts
  //   3. Вставити рядок у workoutSets так, щоб повтор із тим самим dto.id
  //      не падав і не створював дубль.
  //   4. Вирішити, що бачить клієнт на повтор: 201 чи 409 — і чому.
  //      Від цього залежить @ApiResponse у контролері.
  //
  // performedAt приходить рядком ISO 8601, а колонка чекає Date.
  addSet(user: JwtPayload, workoutId: string, dto: CreateWorkoutSetDto) {
    void user;
    void workoutId;
    void dto;
    throw new NotImplementedException();
  }
}
