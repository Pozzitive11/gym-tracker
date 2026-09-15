import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto.js';

import { UpdateProgramDto } from './dto/update-program.dto.js';
import { ProgramsService } from './programs.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApiResponse } from '@nestjs/swagger';
import { ProgramListItemDto, ProgramResponseDto } from './dto/program-response.dto.js';

@Controller('programs')
@UseGuards(AuthGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  // 201 Created — конвенція для створення. Тіла немає: клієнт сам згенерував
  // id і сам надіслав дані, повідомляти йому нічого
  @ApiResponse({ status: 201, description: 'Створено, тіла немає' })
  @ApiResponse({ status: 409, description: 'Програма з таким id вже існує' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createProgramDto: CreateProgramDto,
  ) {
    return this.programsService.create(user, createProgramDto);
  }

  @Get()
  @ApiResponse({ status: 200, type: [ProgramListItemDto] })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.programsService.findAll(user);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ProgramResponseDto })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.programsService.findOne(user, id);
  }

  @Put(':id')
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 200, type: ProgramResponseDto })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateProgramDto: UpdateProgramDto,
  ) {
    return this.programsService.update(user, id, updateProgramDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
    // 204 — повна заміна пройшла, повертати нічого: клієнт надіслав повний стан
  // і вже його знає. Актуальне дерево читається через GET /programs/:id
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.programsService.remove(user, id);
  }
}
