import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { PersonaResumenDto } from '../common/response-dtos';
import { ValidatedResponse } from '../common/validate-response';

@ApiTags('Pacientes')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class UsuariosController {
  constructor(@InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>) {}

  @Get('pacientes')
  @ValidatedResponse(PersonaResumenDto, true)
  async listarPacientes() {
    const pacientes = await this.usuarios.find({where: {rol: RolUsuario.PACIENTE, estado: EstadoUsuario.ACTIVO},
      order: {apellidos: 'ASC', nombres: 'ASC'}, select: {id: true, documento: true, nombres: true, apellidos: true}});
    return pacientes.map(({id,documento,nombres,apellidos}) => ({id,documento,nombres,apellidos}));
  }
}
