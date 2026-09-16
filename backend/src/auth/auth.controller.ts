import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthGuard } from './auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { JwtPayload } from './types/jwt-payload.js';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from './auth.constants.js';
import { RefreshToken } from './decorators/refresh-token.decorator.js';
import { ApiResponse } from '@nestjs/swagger';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { UserDto } from './dto/user.dto.js';
import { ErrorResponseDto } from './dto/error-response.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ErrorResponseDto })
  @Post('/register')
  async register(
    @Body() dto: RegisterDto,
    // passthrough: true лишає звичайну поведінку Nest — можна поставити куку
    // і все одно повернути значення. Без нього Nest перестав би відправляти
    // відповідь за нас, і запит завис би до таймауту
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    // refreshToken у тіло не потрапляє — він іде виключно заголовком Set-Cookie
    return { accessToken };
  }

  @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponseDto })
  @Post('/login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken };
  }

  @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  @Post('/refresh')
  refresh(@RefreshToken() token: string) {
    return this.authService.refresh(token);
  }

  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Post('/logout')
  // за замовчуванням Nest на @Post віддає 201 Created. Тут нічого не
  // створюється й тіла у відповіді немає — 204 описує це чесно
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @RefreshToken() token: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(token);

    // видалити куку з сервера напряму неможливо — вона живе в браузері.
    // clearCookie надсилає ту саму куку з Expires у минулому, і браузер
    // прибирає її сам. Опції мусять бути ТІ САМІ: браузер зіставляє куки
    // за трійкою (ім'я, домен, шлях), тож з іншим path це буде інша кука,
    // а справжня переживе вихід
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  }

  @ApiResponse({ status: HttpStatus.OK, type: UserDto })
  @Get('/me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.findUserById(user.sub);
  }
}
