import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { DRIZZLE, type Db } from '../db/db.module.js';
import { exercises } from '../db/schema.js';
import type { CreateExerciseDto } from './dto/create-exercise.dto.js';

// Що юзер бачить у каталозі: системні вправи плюс свої. Чужі «мої» вправи —
// ні. Цей самий фільтр стоїть скрізь, де клієнт присилає exerciseId: FK
// гарантує лише, що вправа існує, а не що вона доступна цьому юзеру
export const visibleTo = (userId: string): SQL =>
  or(isNull(exercises.userId), eq(exercises.userId, userId))!;

const exerciseColumns = {
  id: exercises.id,
  name: exercises.name,
  isMine: sql<boolean>`${exercises.userId} is not null`,
};

@Injectable()
export class ExercisesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  findAll(user: JwtPayload) {
    return this.db
      .select(exerciseColumns)
      .from(exercises)
      .where(visibleTo(user.sub))
      .orderBy(asc(exercises.name));
  }

  // «Знайти або створити»: заміна посеред тренування вписує назву, і якщо
  // така вправа вже є (системна чи своя, без огляду на регістр) — віддаємо
  // її, а не плодимо дубль. Тому відповідь завжди містить id, яким треба
  // користуватись далі: він може не збігатися з тим, що надіслав клієнт
  async findOrCreate(user: JwtPayload, dto: CreateExerciseDto) {
    const existing = await this.findByName(user, dto.name);
    if (existing) return existing;

    // Між пошуком і вставкою той самий юзер міг створити цю назву паралельним
    // запитом. Тоді вставка впреться в унікальний індекс по lower(name) —
    // onConflictDoNothing гасить це без помилки, і ми просто перечитуємо
    const [created] = await this.db
      .insert(exercises)
      .values({ id: dto.id, userId: user.sub, name: dto.name })
      .onConflictDoNothing()
      .returning(exerciseColumns);

    return created ?? (await this.findByName(user, dto.name))!;
  }

  // Скільки з переданих id юзер має право використовувати. Сервіси програм і
  // тренувань порівнюють результат із кількістю унікальних id на вході
  async countVisible(user: JwtPayload, ids: string[]) {
    if (ids.length === 0) return 0;
    const rows = await this.db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(inArray(exercises.id, ids), visibleTo(user.sub)));
    return rows.length;
  }

  private async findByName(user: JwtPayload, name: string) {
    const [row] = await this.db
      .select(exerciseColumns)
      .from(exercises)
      .where(
        and(
          sql`lower(${exercises.name}) = lower(${name})`,
          visibleTo(user.sub),
        ),
      )
      // системна перемагає свою, якщо раптом є обидві
      .orderBy(sql`${exercises.userId} nulls first`)
      .limit(1);
    return row;
  }
}
