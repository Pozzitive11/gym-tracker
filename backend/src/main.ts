import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // без цього request.cookies завжди undefined, і @RefreshToken() читає порожнечу
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: поля, яких немає в DTO, вирізаються з тіла запиту.
      // Без нього клієнт може дослати зайве поле, і воно долетить до бази
      whitelist: true,
      // transform: без нього @Transform у DTO не виконується взагалі,
      // і email не нормалізується
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    // без credentials браузер не надішле httpOnly-куку з refresh-токеном
    credentials: true,
  });

  // з цієї схеми фронт генерує типізований клієнт — тому вона не документація,
  // а частина контракту
  const swaggerConfig = new DocumentBuilder()
    .setTitle('jym-manager API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api',
    app,
    () => SwaggerModule.createDocument(app, swaggerConfig),
    { jsonDocumentUrl: 'api/openapi.json' },
  );

  await app.listen(config.get<number>('PORT') ?? 3001);
}
await bootstrap();
