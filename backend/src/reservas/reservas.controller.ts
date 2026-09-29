import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ReservasService } from './reservas.service';

import { CrearReservaDto } from './dto/crear-reserva.dto';

import { ListarTurnosMedicoDto } from './dto/listar-turnos-medico.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../common/decorators/roles.decorator';

import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Controller('reservas')
export class ReservasController {
  constructor(
    private readonly reservasService:
      ReservasService,
  ) {}

  @Post()
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.PACIENTE,
    RolUsuario.ADMINISTRADOR,
  )
  crear(
    @Body()
    dto: CrearReservaDto,

    @Req()
    request: {
      user: {
        id: number;
        rol: RolUsuario;
      };
    },
  ) {
    return this.reservasService.crear(
      dto,
      request.user,
    );
  }

  @Get('mis-turnos')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.PACIENTE,
  )
  listarMisTurnos(
    @Req()
    request: {
      user: {
        id: number;
        rol: RolUsuario;
      };
    },
  ) {
    return this.reservasService.listarMisTurnos(
      request.user.id,
    );
  }

  @Get('medico')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.MEDICO,
  )
  listarTurnosMedico(
    @Query()
    query: ListarTurnosMedicoDto,

    @Req()
    request: {
      user: {
        id: number;
        rol: RolUsuario;
      };
    },
  ) {
    return this.reservasService.listarTurnosMedico(
      request.user.id,
      query.fecha,
    );
  }

  @Get('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.ADMINISTRADOR,
  )
  listarTurnosAdministrador() {
    return this.reservasService.listarTurnosAdministrador();
  }

  @Patch(':id/cancelar')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.PACIENTE,
  )
  cancelar(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Req()
    request: {
      user: {
        id: number;
        rol: RolUsuario;
      };
    },
  ) {
    return this.reservasService.cancelarComoPaciente(
      id,
      request.user.id,
    );
  }

  @Patch(':id/cancelar-admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.ADMINISTRADOR,
  )
  cancelarAdministrador(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.reservasService.cancelarComoAdministrador(
      id,
    );
  }

  @Patch(':id/atendido')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.MEDICO,
  )
  marcarAtendido(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Req()
    request: {
      user: {
        id: number;
        rol: RolUsuario;
      };
    },
  ) {
    return this.reservasService.marcarAtendido(
      id,
      request.user.id,
    );
  }

  @Patch(':id/ausente')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    RolUsuario.MEDICO,
  )
  marcarAusente(
    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Req()
    request: {
      user: {
        id: number;
        rol: RolUsuario;
      };
    },
  ) {
    return this.reservasService.marcarAusente(
      id,
      request.user.id,
    );
  }
}