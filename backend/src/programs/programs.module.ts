import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller.js';
import { ProgramsService } from './programs.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  controllers: [ProgramsController],
  providers: [ProgramsService],
  imports: [AuthModule],
})
export class ProgramsModule {}
