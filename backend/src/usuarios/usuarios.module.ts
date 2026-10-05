import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { UsuariosController } from './usuarios.controller';
import { Usuario } from './entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    AuthModule,
  ],

  controllers: [UsuariosController],

  exports: [
    TypeOrmModule,
  ],
})
export class UsuariosModule {}