import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
  Between,
  Not,
  Repository,
  QueryFailedError,
} from 'typeorm';

import { Reserva } from './entities/reserva.entity';
import { Medico } from '../medicos/entities/medico.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

import { CrearReservaDto } from './dto/crear-reserva.dto';

import { EstadoReserva } from '../common/enums/estado-reserva.enum';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

interface UsuarioAutenticado {
  id: number;
  rol: RolUsuario;
}

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,

    @InjectRepository(Medico)
    private readonly medicoRepository: Repository<Medico>,

    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async crear(
    dto: CrearReservaDto,
    usuarioAutenticado: UsuarioAutenticado,
  ) {
    let idPaciente: number;

    if (
      usuarioAutenticado.rol ===
      RolUsuario.PACIENTE
    ) {
      idPaciente = usuarioAutenticado.id;
    } else if (
      usuarioAutenticado.rol ===
      RolUsuario.ADMINISTRADOR
    ) {
      if (!dto.idPaciente) {
        throw new BadRequestException(
          'El administrador debe indicar el paciente',
        );
      }

      idPaciente = dto.idPaciente;
    } else {
      throw new ForbiddenException(
        'El médico no puede reservar turnos',
      );
    }

    const paciente =
      await this.usuarioRepository.findOne({
        where: {
          id: idPaciente,
        },
      });

    if (!paciente) {
      throw new NotFoundException(
        'Paciente no encontrado',
      );
    }

    if (
      paciente.rol !==
      RolUsuario.PACIENTE
    ) {
      throw new BadRequestException(
        'El usuario indicado no es un paciente',
      );
    }

    if (
      paciente.estado !==
      EstadoUsuario.ACTIVO
    ) {
      throw new BadRequestException(
        'El paciente no está activo',
      );
    }

    const medico =
      await this.medicoRepository.findOne({
        where: {
          id: dto.idMedico,
        },
        relations: { usuario: true },
      });

    if (!medico) {
      throw new NotFoundException(
        'Médico no encontrado',
      );
    }

    if (medico.usuario.estado !== EstadoUsuario.ACTIVO || medico.usuario.rol !== RolUsuario.MEDICO) {
      throw new BadRequestException('El médico no está disponible para reservar turnos');
    }

    const fechaHora =
      new Date(dto.fechaHora);

    if (
      Number.isNaN(
        fechaHora.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Fecha y hora inválidas',
      );
    }

    const ahora =
      new Date();

    if (
      fechaHora <= ahora
    ) {
      throw new BadRequestException(
        'No se puede reservar un turno en el pasado',
      );
    }

    const limite =
      new Date();

    limite.setDate(
      limite.getDate() + 30,
    );

    if (
      fechaHora > limite
    ) {
      throw new BadRequestException(
        'Las reservas se pueden realizar con un máximo de 30 días de anticipación',
      );
    }

    const hora =
      fechaHora.getHours();

    const minutos =
      fechaHora.getMinutes();

    const segundos =
      fechaHora.getSeconds();

    if (
      hora < 8 ||
      hora >= 16 ||
      minutos !== 0 ||
      segundos !== 0 ||
      fechaHora.getMilliseconds() !== 0
    ) {
      throw new BadRequestException(
        'Los turnos deben comenzar en hora exacta entre las 08:00 y las 15:00',
      );
    }

    const turnoOcupado =
      await this.reservaRepository.findOne({
        where: {
          medico: {
            id: medico.id,
          },

          fechaHora,

          estado:
            Not(
              EstadoReserva.CANCELADO,
            ),
        },
      });

    if (turnoOcupado) {
      throw new BadRequestException(
        'El médico ya tiene un turno reservado en ese horario',
      );
    }

    const reserva =
      this.reservaRepository.create({
        medico,
        paciente,
        fechaHora,
        estado:
          EstadoReserva.ACTIVO,
        valorConsulta:
          medico.valorConsulta,
      });

    let reservaGuardada: Reserva;
    try {
      reservaGuardada = await this.reservaRepository.save(reserva);
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as {code?: string}).code === '23505') {
        throw new BadRequestException('El médico ya tiene un turno reservado en ese horario');
      }
      throw error;
    }

    return {
      id:
        reservaGuardada.id,

      fechaHora:
        reservaGuardada.fechaHora,

      estado:
        reservaGuardada.estado,

      valorConsulta:
        reservaGuardada.valorConsulta,

      medico: {
        id:
          medico.id,

        matricula:
          medico.matricula,
      },

      paciente: {
        id:
          paciente.id,

        nombres:
          paciente.nombres,

        apellidos:
          paciente.apellidos,
      },
    };
  }

  async listarMisTurnos(
    idPaciente: number,
  ) {
    const reservas =
      await this.reservaRepository.find({
        where: {
          paciente: {
            id: idPaciente,
          },
        },

        relations: {
          medico: {
            usuario: true,
          },
        },

        order: {
          fechaHora: 'ASC',
        },
      });

    return reservas.map(
      (reserva) => ({
        id:
          reserva.id,

        fechaHora:
          reserva.fechaHora,

        estado:
          reserva.estado,

        valorConsulta:
          reserva.valorConsulta,

        medico: {
          id:
            reserva.medico.id,

          matricula:
            reserva.medico.matricula,

          nombres:
            reserva.medico.usuario.nombres,

          apellidos:
            reserva.medico.usuario.apellidos,
        },
      }),
    );
  }

  async cancelarComoPaciente(
    idReserva: number,
    idPaciente: number,
  ) {
    const reserva =
      await this.reservaRepository.findOne({
        where: {
          id: idReserva,
        },

        relations: {
          paciente: true,
          medico: {
            usuario: true,
          },
        },
      });

    if (!reserva) {
      throw new NotFoundException(
        'Reserva no encontrada',
      );
    }

    if (
      reserva.paciente.id !==
      idPaciente
    ) {
      throw new ForbiddenException(
        'No puede cancelar una reserva de otro paciente',
      );
    }

    if (
      reserva.estado !==
      EstadoReserva.ACTIVO
    ) {
      throw new BadRequestException(
        'La reserva no se encuentra activa',
      );
    }

    const ahora =
      new Date();

    const hoy =
      new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
      );

    const fechaConsulta =
      new Date(
        reserva.fechaHora.getFullYear(),
        reserva.fechaHora.getMonth(),
        reserva.fechaHora.getDate(),
      );

    if (
      hoy >= fechaConsulta
    ) {
      throw new BadRequestException(
        'El turno solo puede cancelarse hasta el día anterior a la consulta',
      );
    }

    reserva.estado =
      EstadoReserva.CANCELADO;

    const reservaActualizada =
      await this.guardarEstado(reserva);

    return {
      id:
        reservaActualizada.id,

      fechaHora:
        reservaActualizada.fechaHora,

      estado:
        reservaActualizada.estado,

      valorConsulta:
        reservaActualizada.valorConsulta,
    };
  }

  async listarTurnosMedico(
    idUsuarioMedico: number,
    fecha: string,
  ) {
    const medico =
      await this.medicoRepository.findOne({
        where: {
          usuario: {
            id: idUsuarioMedico,
          },
        },

        relations: {
          usuario: true,
        },
      });

    if (!medico) {
      throw new NotFoundException(
        'Médico no encontrado',
      );
    }

    const fechaInicio =
      new Date(
        `${fecha}T00:00:00`,
      );

    const fechaFin =
      new Date(
        `${fecha}T23:59:59.999`,
      );

    if (
      Number.isNaN(
        fechaInicio.getTime(),
      ) ||
      Number.isNaN(
        fechaFin.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Fecha inválida',
      );
    }

    const reservas =
      await this.reservaRepository.find({
        where: {
          medico: {
            id: medico.id,
          },

          fechaHora:
            Between(
              fechaInicio,
              fechaFin,
            ),

          estado:
            Not(
              EstadoReserva.CANCELADO,
            ),
        },

        relations: {
          paciente: true,
        },

        order: {
          fechaHora: 'ASC',
        },
      });

    return reservas.map(
      (reserva) => ({
        id:
          reserva.id,

        fechaHora:
          reserva.fechaHora,

        estado:
          reserva.estado,

        valorConsulta:
          reserva.valorConsulta,

        paciente: {
          id:
            reserva.paciente.id,

          documento:
            reserva.paciente.documento,

          nombres:
            reserva.paciente.nombres,

          apellidos:
            reserva.paciente.apellidos,

          email:
            reserva.paciente.email,
        },
      }),
    );
  }

  async marcarAtendido(
    idReserva: number,
    idUsuarioMedico: number,
  ) {
    const medico =
      await this.medicoRepository.findOne({
        where: {
          usuario: {
            id: idUsuarioMedico,
          },
        },
      });

    if (!medico) {
      throw new NotFoundException(
        'Médico no encontrado',
      );
    }

    const reserva =
      await this.reservaRepository.findOne({
        where: {
          id: idReserva,
        },

        relations: {
          medico: true,
          paciente: true,
        },
      });

    if (!reserva) {
      throw new NotFoundException(
        'Reserva no encontrada',
      );
    }

    if (
      reserva.medico.id !==
      medico.id
    ) {
      throw new ForbiddenException(
        'No puede modificar un turno de otro médico',
      );
    }

    if (
      reserva.estado !==
      EstadoReserva.ACTIVO
    ) {
      throw new BadRequestException(
        'El turno no se encuentra activo',
      );
    }

    reserva.estado =
      EstadoReserva.ATENDIDO;

    const reservaActualizada =
      await this.guardarEstado(reserva);

    return {
      id:
        reservaActualizada.id,

      fechaHora:
        reservaActualizada.fechaHora,

      estado:
        reservaActualizada.estado,

      valorConsulta:
        reservaActualizada.valorConsulta,

      paciente: {
        id:
          reservaActualizada.paciente.id,

        nombres:
          reservaActualizada.paciente.nombres,

        apellidos:
          reservaActualizada.paciente.apellidos,
      },
    };
  }

  async marcarAusente(
    idReserva: number,
    idUsuarioMedico: number,
  ) {
    const medico =
      await this.medicoRepository.findOne({
        where: {
          usuario: {
            id: idUsuarioMedico,
          },
        },
      });

    if (!medico) {
      throw new NotFoundException(
        'Médico no encontrado',
      );
    }

    const reserva =
      await this.reservaRepository.findOne({
        where: {
          id: idReserva,
        },

        relations: {
          medico: true,
          paciente: true,
        },
      });

    if (!reserva) {
      throw new NotFoundException(
        'Reserva no encontrada',
      );
    }

    if (
      reserva.medico.id !==
      medico.id
    ) {
      throw new ForbiddenException(
        'No puede modificar un turno de otro médico',
      );
    }

    if (
      reserva.estado !==
      EstadoReserva.ACTIVO
    ) {
      throw new BadRequestException(
        'El turno no se encuentra activo',
      );
    }

    reserva.estado =
      EstadoReserva.AUSENTE;

    const reservaActualizada =
      await this.guardarEstado(reserva);

    return {
      id:
        reservaActualizada.id,

      fechaHora:
        reservaActualizada.fechaHora,

      estado:
        reservaActualizada.estado,

      valorConsulta:
        reservaActualizada.valorConsulta,

      paciente: {
        id:
          reservaActualizada.paciente.id,

        nombres:
          reservaActualizada.paciente.nombres,

        apellidos:
          reservaActualizada.paciente.apellidos,
      },
    };
  }

  async listarTurnosAdministrador() {
    const reservas =
      await this.reservaRepository.find({
        relations: {
          paciente: true,

          medico: {
            usuario: true,
          },
        },

        order: {
          fechaHora: 'ASC',
        },
      });

    return reservas.map(
      (reserva) => ({
        id:
          reserva.id,

        fechaHora:
          reserva.fechaHora,

        estado:
          reserva.estado,

        valorConsulta:
          reserva.valorConsulta,

        paciente: {
          id:
            reserva.paciente.id,

          documento:
            reserva.paciente.documento,

          nombres:
            reserva.paciente.nombres,

          apellidos:
            reserva.paciente.apellidos,

          email:
            reserva.paciente.email,
        },

        medico: {
          id:
            reserva.medico.id,

          matricula:
            reserva.medico.matricula,

          nombres:
            reserva.medico.usuario.nombres,

          apellidos:
            reserva.medico.usuario.apellidos,
        },
      }),
    );
  }

  async cancelarComoAdministrador(
    idReserva: number,
  ) {
    const reserva =
      await this.reservaRepository.findOne({
        where: {
          id: idReserva,
        },

        relations: {
          paciente: true,

          medico: {
            usuario: true,
          },
        },
      });

    if (!reserva) {
      throw new NotFoundException(
        'Reserva no encontrada',
      );
    }

    if (
      reserva.estado !==
      EstadoReserva.ACTIVO
    ) {
      throw new BadRequestException(
        'La reserva no se encuentra activa',
      );
    }

    const ahora =
      new Date();

    if (
      ahora >=
      reserva.fechaHora
    ) {
      throw new BadRequestException(
        'El administrador no puede cancelar un turno que ya comenzó',
      );
    }

    reserva.estado =
      EstadoReserva.CANCELADO;

    const reservaActualizada =
      await this.guardarEstado(reserva);

    return {
      id:
        reservaActualizada.id,

      fechaHora:
        reservaActualizada.fechaHora,

      estado:
        reservaActualizada.estado,

      valorConsulta:
        reservaActualizada.valorConsulta,

      paciente: {
        id:
          reservaActualizada.paciente.id,

        nombres:
          reservaActualizada.paciente.nombres,

        apellidos:
          reservaActualizada.paciente.apellidos,
      },

      medico: {
        id:
          reservaActualizada.medico.id,

        matricula:
          reservaActualizada.medico.matricula,

        nombres:
          reservaActualizada.medico.usuario.nombres,

        apellidos:
          reservaActualizada.medico.usuario.apellidos,
      },
    };
  }

  private async guardarEstado(reserva: Reserva) {
    const resultado = await this.reservaRepository.update(
      {id: reserva.id, estado: EstadoReserva.ACTIVO}, {estado: reserva.estado},
    );
    if (resultado.affected !== 1) {
      throw new BadRequestException('El turno ya fue modificado. Actualizá la lista e intentá nuevamente');
    }
    return reserva;
  }

}
