import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AuthUser } from './auth.service';

/** Role guard — the decorated route requires the user to have one of the roles. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('No autenticado');
    if (!required.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
