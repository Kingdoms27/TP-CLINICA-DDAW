import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

describe('Inicio de sesión',()=>{
  const repository={findOne:jest.fn()};
  const jwt=new JwtService({secret:'secreto-de-prueba',signOptions:{expiresIn:'8h'}});
  const service=new AuthService(repository as unknown as Repository<Usuario>,jwt);
  let clave:string;
  beforeAll(async()=>{clave=await bcrypt.hash('Clinica123!',4);});
  beforeEach(()=>jest.clearAllMocks());
  it('valida clave y firma un token sin exponer el hash',async()=>{
    repository.findOne.mockResolvedValue({id:3,documento:'30000001',nombres:'Carlos',apellidos:'Lopez',email:'paciente@clinica.com',estado:EstadoUsuario.ACTIVO,rol:RolUsuario.PACIENTE,clave});
    const response=await service.login({email:'paciente@clinica.com',clave:'Clinica123!'});
    expect(jwt.verify(response.accessToken).sub).toBe(3);expect(response.usuario.rol).toBe('PACIENTE');expect(response.usuario).not.toHaveProperty('clave');
    await expect(service.login({email:'paciente@clinica.com',clave:'incorrecta'})).rejects.toThrow('incorrectos');
  });
  it('rechaza usuario inexistente o dado de baja',async()=>{
    repository.findOne.mockResolvedValue(null);await expect(service.login({email:'otro@clinica.com',clave:'Clinica123!'})).rejects.toThrow('incorrectos');
    repository.findOne.mockResolvedValue({estado:EstadoUsuario.BAJA});await expect(service.login({email:'otro@clinica.com',clave:'Clinica123!'})).rejects.toThrow('activo');
  });
});
