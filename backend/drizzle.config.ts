import { defineConfig } from 'drizzle-kit';

// drizzle-kit — окремий CLI, він запускається повз Nest і про ConfigModule
// нічого не знає. Тому .env читаємо тут самі; loadEnvFile — вбудований у Node,
// зайва залежність не потрібна
process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // ловить розбіжності імен у snake_case/camelCase на етапі генерації
  strict: true,
  verbose: true,
});
