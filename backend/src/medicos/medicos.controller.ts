import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MedicoConsultaDto } from '../common/response-dtos';
import { ValidatedResponse } from '../common/validate-response';
import {
  Body,
  Controller,
  Get,
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

@ApiTags('Médicos')
@ApiBearerAuth()
@Controller('medicos')
export class MedicosController {
  constructor(
    private readonly medicosService:
      MedicosService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.PACIENTE, RolUsuario.ADMINISTRADOR)
  @ValidatedResponse(MedicoConsultaDto, true)
  listarDisponibles() {
    return this.medicosService.listarDisponibles();
  }

  @Patch(':id/valor-consulta')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.ADMINISTRADOR,
  )
  @ValidatedResponse(MedicoConsultaDto)
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
