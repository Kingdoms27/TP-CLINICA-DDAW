import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Reserva } from './entities/reserva.entity';
import { Medico } from '../medicos/entities/medico.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reserva,
      Medico,
      Usuario,
    ]),
    AuthModule,
  ],

  controllers: [
    ReservasController,
  ],

  providers: [
    ReservasService,
  ],

  exports: [
    ReservasService,
  ],
})
export class ReservasModule {}