import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
  ROLES_KEY,
} from '../../common/decorators/roles.decorator';

import {
  RolUsuario,
} from '../../common/enums/rol-usuario.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {

    const rolesPermitidos =
      this.reflector.getAllAndOverride<
        RolUsuario[]
      >(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!rolesPermitidos) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const usuario = request.user;

    return rolesPermitidos.includes(
      usuario.rol,
    );
  }
}