import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Символ, а не рядок: два різні модулі не зможуть випадково зареєструвати
// провайдер під тим самим ключем
export const DRIZZLE = Symbol('DRIZZLE');
const PG_POOL = Symbol('PG_POOL');

// Тип бази зі схемою всередині — саме він дає типізацію запитів у сервісах
export type Db = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      // getOrThrow, а не get: без DATABASE_URL застосунок має падати на старті,
      // а не віддавати undefined у драйвер і ламатись на першому запиті
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // без цього кожен перезапуск у watch-режимі лишає висіти відкриті
  // з'єднання, і Postgres упирається в ліміт
  async onModuleDestroy() {
    await this.pool.end();
  }
}
