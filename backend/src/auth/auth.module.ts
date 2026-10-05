import { Module } from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  JwtModule,
} from '@nestjs/jwt';

import {
  PassportModule,
} from '@nestjs/passport';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  Usuario,
} from '../usuarios/entities/usuario.entity';

import {
  AuthController,
} from './auth.controller';

import {
  AuthService,
} from './auth.service';

import {
  JwtStrategy,
} from './strategies/jwt.strategy';

import {
  RolesGuard,
} from './guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
    ]),

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    ConfigModule,

    JwtModule.registerAsync({
      imports: [
        ConfigModule,
      ],

      inject: [
        ConfigService,
      ],

      useFactory: (
        configService: ConfigService,
      ) => ({
        secret:
          configService.getOrThrow<string>(
            'JWT_SECRET',
          ),

        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRES_IN_SECONDS') ? Number(configService.get<number>('JWT_EXPIRES_IN_SECONDS')) : 28800,
        },
      }),
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
  ],

  exports: [
    AuthService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}