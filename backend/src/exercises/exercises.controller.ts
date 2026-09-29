import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiDefaultResponse, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';
import { ExerciseResponseDto } from './dto/exercise-response.dto.js';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
@UseGuards(AuthGuard)
@ApiDefaultResponse({ type: ErrorResponseDto })
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [ExerciseResponseDto] })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.exercisesService.findAll(user);
  }

  // На відміну від POST /programs, тут є тіло відповіді: якщо вправа з такою
  // назвою вже існувала, сервер віддає її id замість клієнтського
  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ExerciseResponseDto,
    description: 'Створена вправа або вже наявна з такою самою назвою',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: ErrorResponseDto,
    description: 'Тіло не пройшло валідацію',
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.findOrCreate(user, dto);
  }
}
