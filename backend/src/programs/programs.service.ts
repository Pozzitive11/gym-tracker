import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { DRIZZLE } from '../db/db.module.js';
import { type Db } from '../db/db.module.js';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { programs, programDays, dayExercises } from '../db/schema.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

@Injectable()
export class ProgramsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(user: JwtPayload, createProgramDto: CreateProgramDto) {
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

    const allExercises = await this.db
      .select({
        id: dayExercises.id,
        name: dayExercises.name,
        targetSets: dayExercises.targetSets,
        targetReps: dayExercises.targetReps,
        dayId: dayExercises.dayId,
      })
      .from(dayExercises)
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

      // вправи видаляти окремо не треба — вони підуть каскадом за днями
      await tx.delete(programDays).where(eq(programDays.programId, id));

      const { dayRows, exerciseRows } = this.buildChildRows(
        id,
        updateProgramDto.days,
      );

      await tx.insert(programDays).values(dayRows);
      await tx.insert(dayExercises).values(exerciseRows);
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
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        position: exerciseIndex,
      })),
    );

    return { dayRows, exerciseRows };
  }

  async remove(user: JwtPayload, id: string) {
    const [program] = await this.db
      .delete(programs)
      .where(and(eq(programs.userId, user.sub), eq(programs.id, id)))
      .returning();

    if (!program) throw new NotFoundException();
  }
}
