import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ExercisesController } from './exercises.controller.js';
import { ExercisesService } from './exercises.service.js';

@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService],
  imports: [AuthModule],
  // програми й тренування перевіряють через нього, чи доступні юзеру вправи
  exports: [ExercisesService],
})
export class ExercisesModule {}
