import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
} from 'drizzle-orm';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { DRIZZLE, type Db } from '../db/db.module.js';
import {
  dayExercises,
  exercises,
  programDays,
  programs,
  workouts,
  workoutSets,
} from '../db/schema.js';
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

    const plan = workout.programDayId
      ? await this.findDayPlan(workout.programDayId)
      : [];
    const last = await this.findLastSets(
      user,
      workout.id,
      plan.map((exercise) => exercise.exerciseId),
    );

    return {
      ...workout,
      exercises: plan.map((exercise) => ({
        ...exercise,
        lastWeight: last.get(exercise.exerciseId)?.weight ?? null,
        lastReps: last.get(exercise.exerciseId)?.reps ?? null,
      })),
      sets,
    };
  }

  // Наступний день активної програми: той, що йде після дня останнього
  // завершеного тренування за цією програмою, по колу (A → B → C → A).
  // Тренувань ще не було або останній день уже видалили — перший день.
  // null — активної програми нема
  async findNext(user: JwtPayload) {
    const days = await this.db
      .select({ id: programDays.id, name: programDays.name })
      .from(programDays)
      .innerJoin(programs, eq(programs.id, programDays.programId))
      .where(and(eq(programs.userId, user.sub), eq(programs.isActive, true)))
      .orderBy(asc(programDays.position));

    if (days.length === 0) return null;

    const [last] = await this.db
      .select({ programDayId: workouts.programDayId })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, user.sub),
          isNotNull(workouts.finishedAt),
          inArray(
            workouts.programDayId,
            days.map((day) => day.id),
          ),
        ),
      )
      .orderBy(desc(workouts.finishedAt))
      .limit(1);

    const lastIndex = days.findIndex((day) => day.id === last?.programDayId);
    // -1 (тренувань не було) + 1 = 0: перший день, окремої гілки не треба
    const next = days[(lastIndex + 1) % days.length];

    const plan = await this.findDayPlan(next.id);
    return {
      programDayId: next.id,
      dayName: next.name,
      exerciseNames: plan.map((exercise) => exercise.name),
    };
  }

  // Останній підхід кожної з вправ у МИНУЛИХ тренуваннях юзера — звідси
  // початкова вага на екрані тренування.
  //
  // Задача «останній рядок у кожній групі» (greatest-n-per-group). У
  // Postgres для неї є DISTINCT ON: сортуємо за вправою, а всередині —
  // від найсвіжішого, і DISTINCT ON (exercise_id) лишає з кожної групи
  // перший рядок, тобто найсвіжіший. Альтернатива — віконна функція
  // ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY performed_at DESC)
  // і фільтр = 1: переносимо між базами, але довше
  private async findLastSets(
    user: JwtPayload,
    currentWorkoutId: string,
    exerciseIds: string[],
  ) {
    if (exerciseIds.length === 0) {
      return new Map<string, { weight: number; reps: number }>();
    }

    const rows = await this.db
      .selectDistinctOn([workoutSets.exerciseId], {
        exerciseId: workoutSets.exerciseId,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
      })
      .from(workoutSets)
      .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
      .where(
        and(
          eq(workouts.userId, user.sub),
          ne(workouts.id, currentWorkoutId),
          inArray(workoutSets.exerciseId, exerciseIds),
        ),
      )
      .orderBy(workoutSets.exerciseId, desc(workoutSets.performedAt));

    return new Map(rows.map((row) => [row.exerciseId, row]));
  }

  // Вправи дня з назвами з каталогу, по порядку
  private findDayPlan(programDayId: string) {
    return this.db
      .select({
        id: dayExercises.id,
        exerciseId: dayExercises.exerciseId,
        name: exercises.name,
        targetSets: dayExercises.targetSets,
        targetReps: dayExercises.targetReps,
      })
      .from(dayExercises)
      .innerJoin(exercises, eq(exercises.id, dayExercises.exerciseId))
      .where(eq(dayExercises.dayId, programDayId))
      .orderBy(asc(dayExercises.position));
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
