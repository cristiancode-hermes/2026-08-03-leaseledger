import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './auth.service';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return data ? user?.[data as keyof AuthUser] : user;
  },
);
