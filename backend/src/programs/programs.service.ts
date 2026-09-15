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
    return await this.db
      .select({
        id: programs.id,
        name: programs.name,
        isActive: programs.isActive,
      })
      .from(programs)
      .where(eq(programs.userId, user.sub))
      .orderBy(desc(programs.isActive), desc(programs.createdAt));
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

    const programDaysArray = await this.db
      .select({
        id: programDays.id,
        name: programDays.name,
      })
      .from(programDays)
      .where(eq(programDays.programId, program.id))
      .orderBy(asc(programDays.position));

    const dayExercisesArray = await this.db
      .select({
        id: dayExercises.id,
        name: dayExercises.name,
        targetSets: dayExercises.targetSets,
        targetReps: dayExercises.targetReps,
        dayId: dayExercises.dayId,
      })
      .from(dayExercises)
      .where(
        inArray(
          dayExercises.dayId,
          programDaysArray.map((day) => day.id),
        ),
      )
      .orderBy(asc(dayExercises.position));

    return {
      ...program,
      days: programDaysArray.map((day) => ({
        ...day,
        exercises: dayExercisesArray
          .filter((exercise) => exercise.dayId === day.id)
          .map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
          })),
      })),
    };
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
