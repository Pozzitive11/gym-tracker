import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiDefaultResponse, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { IdParamDto } from '../common/dto/id-param.dto.js';
import { CreateWorkoutSetDto } from './dto/create-workout-set.dto.js';
import { StartWorkoutDto } from './dto/start-workout.dto.js';
import { ActiveWorkoutResponseDto } from './dto/workout-response.dto.js';
import { WorkoutsService } from './workouts.service.js';

@Controller('workouts')
@UseGuards(AuthGuard)
@ApiDefaultResponse({ type: ErrorResponseDto })
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Тренування почалось, тіла немає',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: ErrorResponseDto,
    description: 'Тіло не пройшло валідацію або дня не знайдено',
  })
  @ApiResponse({ status: 409, description: 'Тренування з таким id вже існує' })
  start(@CurrentUser() user: JwtPayload, @Body() dto: StartWorkoutDto) {
    return this.workoutsService.start(user, dto);
  }

  // 204, а не 404, коли активного нема: це не помилка, а звичайний стан
  // «зараз не тренуюсь». 404 клієнт мусив би відрізняти від справжньої
  // помилки маршруту
  @Get('active')
  @ApiResponse({ status: HttpStatus.OK, type: ActiveWorkoutResponseDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Активного тренування нема',
  })
  async findActive(
    @CurrentUser() user: JwtPayload,
    // passthrough: відповідь і далі формує Nest, ми лише міняємо статус
    @Res({ passthrough: true }) res: Response,
  ) {
    const workout = await this.workoutsService.findActive(user);
    if (!workout) res.status(HttpStatus.NO_CONTENT);
    return workout ?? undefined;
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Нема такого незавершеного тренування',
  })
  finish(@CurrentUser() user: JwtPayload, @Param() { id }: IdParamDto) {
    return this.workoutsService.finish(user, id);
  }

  // TODO(Влад): крок 7. Статуси нижче — чернетка, уточни після рішення
  // про повтор (201 чи 409)
  @Post(':id/sets')
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Підхід записано' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    type: ErrorResponseDto,
    description: 'id не є UUID або тіло не пройшло валідацію',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  addSet(
    @CurrentUser() user: JwtPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: CreateWorkoutSetDto,
  ) {
    return this.workoutsService.addSet(user, id, dto);
  }
}
