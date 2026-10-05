import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { EstadoReserva } from '../../common/enums/estado-reserva.enum';
import { Medico } from '../../medicos/entities/medico.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Index('reserva_medico_horario_ocupado', ['medico', 'fechaHora'], {unique: true, where: "estado <> 'CANCELADO'"})
@Entity('reservas')
export class Reserva {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Medico, (medico) => medico.reservas, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'id_medico',
  })
  medico: Medico;

  @RelationId((reserva: Reserva) => reserva.medico)
  idMedico: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.reservas, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'id_paciente',
  })
  paciente: Usuario;

  @RelationId((reserva: Reserva) => reserva.paciente)
  idPaciente: number;

  @Column({
    name: 'fecha_hora',
    type: 'timestamp',
  })
  fechaHora: Date;

  @Column({
    type: 'enum',
    enum: EstadoReserva,
  })
  estado: EstadoReserva;

  @Column({
    name: 'valor_consulta',
    type: 'int',
  })
  valorConsulta: number;
}