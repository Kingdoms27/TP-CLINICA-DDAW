import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  Medico,
} from './entities/medico.entity';

import {
  ActualizarValorConsultaDto,
} from './dto/actualizar-valor-consulta.dto';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@Injectable()
export class MedicosService {
  constructor(
    @InjectRepository(Medico)
    private readonly medicoRepository:
      Repository<Medico>,
  ) {}

  async listarDisponibles() {
    const medicos = await this.medicoRepository.find({
      where: { usuario: { estado: EstadoUsuario.ACTIVO, rol: RolUsuario.MEDICO } },
      relations: { usuario: true },
      order: { usuario: { apellidos: 'ASC', nombres: 'ASC' } },
    });
    return medicos.map((medico) => ({
      id: medico.id,
      matricula: medico.matricula,
      valorConsulta: medico.valorConsulta,
      nombres: medico.usuario.nombres,
      apellidos: medico.usuario.apellidos,
    }));
  }

  async actualizarValorConsulta(
    idMedico: number,
    dto: ActualizarValorConsultaDto,
  ) {
    const medico =
      await this.medicoRepository.findOne({
        where: {
          id: idMedico,
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

    medico.valorConsulta =
      dto.valorConsulta;

    const medicoActualizado =
      await this.medicoRepository.save(
        medico,
      );

    return {
      id:
        medicoActualizado.id,

      matricula:
        medicoActualizado.matricula,

      valorConsulta:
        medicoActualizado.valorConsulta,

      usuario: {
        id:
          medico.usuario.id,

        nombres:
          medico.usuario.nombres,

        apellidos:
          medico.usuario.apellidos,

        email:
          medico.usuario.email,
      },
    };
  }
}
