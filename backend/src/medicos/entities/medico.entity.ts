import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Reserva } from '../../reservas/entities/reserva.entity';

@Entity('medicos')
export class Medico {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Usuario, (usuario) => usuario.medico, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'id_usuario',
  })
  usuario: Usuario;

  @RelationId((medico: Medico) => medico.usuario)
  idUsuario: number;

  @Column({
    type: 'int',
  })
  matricula: number;

  @Column({
    name: 'valor_consulta',
    type: 'int',
  })
  valorConsulta: number;

  @OneToMany(() => Reserva, (reserva) => reserva.medico)
  reservas?: Reserva[];
}