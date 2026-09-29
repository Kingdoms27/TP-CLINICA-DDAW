import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';
import { Medico } from '../../medicos/entities/medico.entity';
import { Reserva } from '../../reservas/entities/reserva.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'text',
    unique: true,
  })
  documento: string;

  @Column({
    type: 'text',
  })
  apellidos: string;

  @Column({
    type: 'text',
  })
  nombres: string;

  @Column({
    type: 'text',
  })
  email: string;

  @Column({
    type: 'text',
  })
  clave: string;

  @Column({
    type: 'enum',
    enum: EstadoUsuario,
  })
  estado: EstadoUsuario;

  @Column({
    type: 'enum',
    enum: RolUsuario,
  })
  rol: RolUsuario;

  @OneToOne(() => Medico, (medico) => medico.usuario)
  medico?: Medico;

  @OneToMany(() => Reserva, (reserva) => reserva.paciente)
  reservas?: Reserva[];
}