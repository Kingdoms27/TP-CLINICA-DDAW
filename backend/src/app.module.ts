import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsuariosModule } from './usuarios/usuarios.module';
import { MedicosModule } from './medicos/medicos.module';
import { ReservasModule } from './reservas/reservas.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.getOrThrow<string>('DB_HOST'),

        port: Number(
          configService.getOrThrow<string>('DB_PORT'),
        ),

        username:
          configService.getOrThrow<string>('DB_USERNAME'),

        password:
          configService.getOrThrow<string>('DB_PASSWORD'),

        database:
          configService.getOrThrow<string>('DB_DATABASE'),

        autoLoadEntities: true,

        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true' || (configService.get<string>('DB_SYNCHRONIZE') !== 'false' && process.env.NODE_ENV !== 'production'),
      }),
    }),

    UsuariosModule,
    MedicosModule,
    ReservasModule,
    AuthModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}