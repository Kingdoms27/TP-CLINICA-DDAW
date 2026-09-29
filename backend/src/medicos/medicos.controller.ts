import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import {
  MedicosService,
} from './medicos.service';

import {
  ActualizarValorConsultaDto,
} from './dto/actualizar-valor-consulta.dto';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  RolesGuard,
} from '../auth/guards/roles.guard';

import {
  Roles,
} from '../common/decorators/roles.decorator';

import {
  RolUsuario,
} from '../common/enums/rol-usuario.enum';

@Controller('medicos')
export class MedicosController {
  constructor(
    private readonly medicosService:
      MedicosService,
  ) {}

  @Patch(':id/valor-consulta')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.ADMINISTRADOR,
  )
  actualizarValorConsulta(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    dto: ActualizarValorConsultaDto,
  ) {
    return this.medicosService.actualizarValorConsulta(
      id,
      dto,
    );
  }
}