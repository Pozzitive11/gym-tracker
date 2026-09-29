import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { DRIZZLE } from '../db/db.module.js';
import { type Db } from '../db/db.module.js';
import { and, asc, desc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import {
  programs,
  programDays,
  dayExercises,
  exercises,
} from '../db/schema.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { ExercisesService } from '../exercises/exercises.service.js';

// У ON CONFLICT DO UPDATE значення рядка, який НЕ вдалося вставити, лежать
// у псевдотаблиці excluded. Drizzle окремого хелпера для неї не має
const excluded = (column: PgColumn) => sql.raw(`excluded."${column.name}"`);

@Injectable()
export class ProgramsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly exercisesService: ExercisesService,
  ) {}

  async create(user: JwtPayload, createProgramDto: CreateProgramDto) {
    await this.assertExercisesVisible(user, createProgramDto.days);

    await this.db.transaction(async (tx) => {
      const program = {
        id: createProgramDto.id,
        userId: user.sub,
        name: createProgramDto.name,
        isActive: createProgramDto.isActive,
      };
      if (program.isActive) {
        await tx
          .update(programs)
          .set({ isActive: false })
          .where(
            and(eq(programs.userId, user.sub), eq(programs.isActive, true)),
          );
      }

      await tx.insert(programs).values(program);

      const { dayRows, exerciseRows } = this.buildChildRows(
        program.id,
        createProgramDto.days,
      );

      await tx.insert(programDays).values(dayRows);
      await tx.insert(dayExercises).values(exerciseRows);
    });
  }

  async findAll(user: JwtPayload) {
    const allPrograms = await this.db
      .select({
        id: programs.id,
        name: programs.name,
        isActive: programs.isActive,
      })
      .from(programs)
      .where(eq(programs.userId, user.sub))
      .orderBy(desc(programs.isActive), desc(programs.createdAt));

    const withDays = await this.attachDaysAndExercises(allPrograms);

    // Список не показує самі вправи — лише кількості. attachDaysAndExercises
    // усе одно тягне повне дерево одним пакетним запитом (не N+1), просто
    // перед відправкою клієнту зрізаємо його до легкої форми
    return withDays.map(({ days, ...program }) => ({
      ...program,
      dayCount: days.length,
      exerciseCount: days.reduce((sum, day) => sum + day.exercises.length, 0),
    }));
  }

  async findOne(user: JwtPayload, id: string) {
    const [program] = await this.db
      .select({
        id: programs.id,
        name: programs.name,
        isActive: programs.isActive,
      })
      .from(programs)
      .where(and(eq(programs.userId, user.sub), eq(programs.id, id)));

    if (!program) throw new NotFoundException();

    // Той самий шлях групування, що й findAll — просто з масивом на один
    // елемент. IN (x) для однієї програми не гірший за WHERE = x, тож
    // дублювати логіку заради "особливого випадку з однією програмою" сенсу
    // нема
    const [result] = await this.attachDaysAndExercises([program]);
    return result;
  }

  // Спільне групування днів і вправ для findOne і findAll. Приймає масив
  // програм (для findOne — масив з одним елементом), а не одну програму,
  // саме щоб дні й вправи можна було витягти ОДНИМ запитом на всіх, а не
  // окремим запитом на кожну — інакше знову вийшов би N+1
  private async attachDaysAndExercises(
    programsList: { id: string; name: string; isActive: boolean }[],
  ) {
    const programIds = programsList.map((program) => program.id);

    // inArray з порожнім масивом (немає жодної програми) Drizzle сам
    // перетворює на SQL false — поверне 0 рядків без синтаксичної помилки,
    // окремо перевіряти порожній список не треба
    const allDays = await this.db
      .select({
        id: programDays.id,
        name: programDays.name,
        programId: programDays.programId,
      })
      .from(programDays)
      .where(inArray(programDays.programId, programIds))
      .orderBy(asc(programDays.position));

    const dayIds = allDays.map((day) => day.id);

    // Назва живе в каталозі, у day_exercises — лише посилання на неї
    const allExercises = await this.db
      .select({
        id: dayExercises.id,
        exerciseId: dayExercises.exerciseId,
        name: exercises.name,
        targetSets: dayExercises.targetSets,
        targetReps: dayExercises.targetReps,
        dayId: dayExercises.dayId,
      })
      .from(dayExercises)
      .innerJoin(exercises, eq(exercises.id, dayExercises.exerciseId))
      .where(inArray(dayExercises.dayId, dayIds))
      .orderBy(asc(dayExercises.position));

    return programsList.map((program) => ({
      ...program,
      days: allDays
        .filter((day) => day.programId === program.id)
        .map((day) => ({
          id: day.id,
          name: day.name,
          exercises: allExercises
            .filter((exercise) => exercise.dayId === day.id)
            .map((exercise) => ({
              id: exercise.id,
              exerciseId: exercise.exerciseId,
              name: exercise.name,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
            })),
        })),
    }));
  }

  async update(
    user: JwtPayload,
    id: string,
    updateProgramDto: UpdateProgramDto,
  ) {
    await this.assertExercisesVisible(user, updateProgramDto.days);

    await this.db.transaction(async (tx) => {
      const program = {
        name: updateProgramDto.name,
        isActive: updateProgramDto.isActive,
      };
      if (program.isActive) {
        await tx
          .update(programs)
          .set({ isActive: false })
          .where(
            and(eq(programs.userId, user.sub), eq(programs.isActive, true)),
          );
      }

      const [updatedProgram] = await tx
        .update(programs)
        .set(program)
        .where(and(eq(programs.id, id), eq(programs.userId, user.sub)))
        .returning();

      if (!updatedProgram) throw new NotFoundException();

      const { dayRows, exerciseRows } = this.buildChildRows(
        id,
        updateProgramDto.days,
      );
      const dayIds = dayRows.map((day) => day.id);
      const exerciseIds = exerciseRows.map((exercise) => exercise.id);

      // Дифф, а не «видалити все й вставити заново». Рядки днів і вправ
      // лишаються тими самими, поки юзер їх не прибрав: на program_days
      // посилаються тренування (ON DELETE SET NULL), і повна заміна
      // обнуляла б це посилання на кожне збереження програми.
      //
      // Upsert по id небезпечний без перевірки: клієнт може прислати id дня
      // чужої програми, і ON CONFLICT DO UPDATE перезаписав би чужий рядок.
      // Тож спершу переконуємось, що кожен уже наявний id — наш
      await this.assertOwnedChildren(tx, id, dayIds, exerciseIds);

      // Прибрані дні (їхні вправи підуть каскадом) і прибрані вправи
      // днів, що лишились
      await tx
        .delete(programDays)
        .where(
          and(
            eq(programDays.programId, id),
            notInArray(programDays.id, dayIds),
          ),
        );
      await tx
        .delete(dayExercises)
        .where(
          and(
            inArray(dayExercises.dayId, dayIds),
            notInArray(dayExercises.id, exerciseIds),
          ),
        );

      await tx
        .insert(programDays)
        .values(dayRows)
        .onConflictDoUpdate({
          target: programDays.id,
          set: {
            name: excluded(programDays.name),
            position: excluded(programDays.position),
          },
        });
      await tx
        .insert(dayExercises)
        .values(exerciseRows)
        .onConflictDoUpdate({
          target: dayExercises.id,
          set: {
            dayId: excluded(dayExercises.dayId),
            exerciseId: excluded(dayExercises.exerciseId),
            targetSets: excluded(dayExercises.targetSets),
            targetReps: excluded(dayExercises.targetReps),
            position: excluded(dayExercises.position),
          },
        });
    });
    return this.findOne(user, id);
  }

  // Дні й вправи будуються однаково в create і update — різниця лише в тому,
  // звідки береться programId. Саме тут неявний порядок із масиву DTO стає
  // явним числом у колонці position: індекс елемента і є позицією.
  //
  // Для вправ position рахується в межах СВОГО дня (індекс у day.exercises),
  // а не наскрізно — тому нумерація живе у внутрішньому map, а не після flat
  private buildChildRows(programId: string, days: CreateProgramDto['days']) {
    const dayRows = days.map((day, index) => ({
      id: day.id,
      programId,
      name: day.name,
      position: index,
    }));

    const exerciseRows = days.flatMap((day) =>
      day.exercises.map((exercise, exerciseIndex) => ({
        id: exercise.id,
        dayId: day.id,
        exerciseId: exercise.exerciseId,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        position: exerciseIndex,
      })),
    );

    return { dayRows, exerciseRows };
  }

  // FK на exercises перевіряє лише, що вправа існує. Чужа «моя» вправа
  // теж існує — без цієї перевірки її можна було б вписати у свою програму
  private async assertExercisesVisible(
    user: JwtPayload,
    days: CreateProgramDto['days'],
  ) {
    const ids = [
      ...new Set(days.flatMap((day) => day.exercises.map((e) => e.exerciseId))),
    ];
    const visible = await this.exercisesService.countVisible(user, ids);
    if (visible !== ids.length) {
      throw new BadRequestException('Вправу не знайдено в каталозі');
    }
  }

  // Чи не підсунув клієнт id дня або вправи дня з ЧУЖОЇ програми. Upsert
  // по id (ON CONFLICT DO UPDATE) цього не розрізняє: якщо прийде id дня
  // Петра, він просто оновив би день Петра нашими даними. Тож до upsert
  // шукаємо серед надісланих id такі, що вже є в базі, але під іншою
  // програмою. Знайшовся хоч один — 409, нічого не зберігаємо.
  // Нові id (яких ще нема в базі) сюди не потрапляють — їх upsert вставить.
  private async assertOwnedChildren(
    tx: Parameters<Parameters<Db['transaction']>[0]>[0],
    programId: string,
    dayIds: string[],
    exerciseIds: string[],
  ) {
    const [foreignDay] = await tx
      .select({ id: programDays.id })
      .from(programDays)
      .where(
        and(
          inArray(programDays.id, dayIds),
          ne(programDays.programId, programId),
        ),
      )
      .limit(1);

    const [foreignExercise] = await tx
      .select({ id: dayExercises.id })
      .from(dayExercises)
      .innerJoin(programDays, eq(programDays.id, dayExercises.dayId))
      .where(
        and(
          inArray(dayExercises.id, exerciseIds),
          ne(programDays.programId, programId),
        ),
      )
      .limit(1);

    if (foreignDay || foreignExercise) {
      throw new ConflictException('Запис із таким id належить іншій програмі');
    }
  }

  async remove(user: JwtPayload, id: string) {
    const [program] = await this.db
      .delete(programs)
      .where(and(eq(programs.userId, user.sub), eq(programs.id, id)))
      .returning();

    if (!program) throw new NotFoundException();
  }
}
