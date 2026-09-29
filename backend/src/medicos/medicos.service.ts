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

@Injectable()
export class MedicosService {
  constructor(
    @InjectRepository(Medico)
    private readonly medicoRepository:
      Repository<Medico>,
  ) {}

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