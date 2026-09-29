import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorkoutsController } from './workouts.controller.js';
import { WorkoutsService } from './workouts.service.js';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
  imports: [AuthModule],
})
export class WorkoutsModule {}
