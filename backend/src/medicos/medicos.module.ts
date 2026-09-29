import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  Medico,
} from './entities/medico.entity';

import {
  MedicosController,
} from './medicos.controller';

import {
  MedicosService,
} from './medicos.service';

import {
  AuthModule,
} from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Medico,
    ]),

    AuthModule,
  ],

  controllers: [
    MedicosController,
  ],

  providers: [
    MedicosService,
  ],

  exports: [
    TypeOrmModule,
    MedicosService,
  ],
})
export class MedicosModule {}