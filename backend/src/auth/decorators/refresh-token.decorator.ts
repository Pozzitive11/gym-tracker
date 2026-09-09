import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REFRESH_COOKIE_NAME } from '../auth.constants.js';
import { Request } from 'express';

export const RefreshToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.cookies?.[REFRESH_COOKIE_NAME];
  },
);
