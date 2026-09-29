import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { DRIZZLE, type Db } from '../db/db.module.js';
import { programDays, programs, workouts, workoutSets } from '../db/schema.js';
import type { CreateWorkoutSetDto } from './dto/create-workout-set.dto.js';
import type { StartWorkoutDto } from './dto/start-workout.dto.js';
import { ExercisesService } from '../exercises/exercises.service.js';

@Injectable()
export class WorkoutsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly exercisesService: ExercisesService,
  ) {}

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

  // Запис одного підходу. Дві перевірки перед вставкою:
  //   - тренування належить юзеру і ще триває — інакше 404, як у finish:
  //     чуже тренування для нас не існує;
  //   - обидві вправи (реальна і, якщо була заміна, запланована) доступні
  //     юзеру — FK перевіряє лише існування, чужа «моя» вправа теж існує.
  //
  // Ідемпотентність: id підходу генерує клієнт один раз, і повтор після
  // загубленої відповіді приходить з тим самим id. ON CONFLICT DO NOTHING
  // нічого не вставляє і не падає, тож повтор теж отримує 201 — для
  // клієнта це просто успіх, окремо обробляти нічого не треба.
  //
  // Без транзакції свідомо: між перевіркою і вставкою тренування можуть
  // завершити, і підхід ляже в щойно закрите тренування. Ціна — зайвий
  // рядок в історії, а не зламані дані; блокування цього не варте.
  async addSet(user: JwtPayload, workoutId: string, dto: CreateWorkoutSetDto) {
    const [workout] = await this.db
      .select({ id: workouts.id })
      .from(workouts)
      .where(
        and(
          eq(workouts.id, workoutId),
          eq(workouts.userId, user.sub),
          isNull(workouts.finishedAt),
        ),
      )
      .limit(1);
    if (!workout) throw new NotFoundException('Тренування не знайдено');

    const exerciseIds = [
      ...new Set(
        [dto.exerciseId, dto.plannedExerciseId].filter(
          (id): id is string => id !== undefined,
        ),
      ),
    ];
    const visible = await this.exercisesService.countVisible(user, exerciseIds);
    if (visible !== exerciseIds.length) {
      throw new BadRequestException('Вправу не знайдено в каталозі');
    }

    await this.db
      .insert(workoutSets)
      .values({
        id: dto.id,
        workoutId,
        exerciseId: dto.exerciseId,
        plannedExerciseId: dto.plannedExerciseId ?? null,
        weight: dto.weight,
        reps: dto.reps,
        performedAt: new Date(dto.performedAt),
      })
      .onConflictDoNothing({ target: workoutSets.id });
  }
}
