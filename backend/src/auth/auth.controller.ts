import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SesionRespuestaDto } from '../common/response-dtos';
import { ValidatedResponse } from '../common/validate-response';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  AuthService,
} from './auth.service';

import {
  LoginDto,
} from './dto/login.dto';

import {
  JwtAuthGuard,
} from './guards/jwt-auth.guard';

import {
  RolesGuard,
} from './guards/roles.guard';

import {
  Roles,
} from '../common/decorators/roles.decorator';

import {
  RolUsuario,
} from '../common/enums/rol-usuario.enum';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ValidatedResponse(SesionRespuestaDto)
  login(
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.login(loginDto);
  }

  @ApiBearerAuth()
  @Get('protegido')
  @UseGuards(JwtAuthGuard)
  rutaProtegida() {
    return {
      message:
        'JWT válido. Acceso autorizado.',
    };
  }

  @ApiBearerAuth()
  @Get('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.ADMINISTRADOR,
  )
  rutaAdministrador() {
    return {
      message:
        'Acceso autorizado para ADMINISTRADOR.',
    };
  }
}