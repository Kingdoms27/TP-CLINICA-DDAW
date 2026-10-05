import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { UnauthorizedException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { RolUsuario } from '../../common/enums/rol-usuario.enum';

interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  'jwt',
) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.getOrThrow<string>(
          'JWT_SECRET',
        ),
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.usuarios.findOne({where: {id: payload.sub}});
    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO || usuario.rol !== payload.rol) {
      throw new UnauthorizedException('La sesión ya no está habilitada');
    }
    return {id: usuario.id, email: usuario.email, rol: usuario.rol};
  }
}
