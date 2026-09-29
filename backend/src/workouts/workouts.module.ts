import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorkoutsController } from './workouts.controller.js';
import { WorkoutsService } from './workouts.service.js';
import { ExercisesModule } from '../exercises/exercises.module.js';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
  imports: [AuthModule, ExercisesModule],
})
export class WorkoutsModule {}
