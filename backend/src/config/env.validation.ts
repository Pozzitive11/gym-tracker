import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, validateSync } from 'class-validator';

// Змінні оточення перевіряються на старті: відсутній JWT_SECRET має валити
// процес одразу, а не вилазити UnauthorizedException посеред робочого дня
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const parsed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Невалідне оточення:\n${details}`);
  }

  // повертаємо ВЕСЬ config, а не тільки перевірені поля: інакше з нього
  // зникли б PORT і решта змінних, які ми не валідуємо
  return config;
}
