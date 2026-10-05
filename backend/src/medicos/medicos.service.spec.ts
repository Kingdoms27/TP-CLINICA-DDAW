import { Repository } from 'typeorm';
import { MedicosService } from './medicos.service';
import { Medico } from './entities/medico.entity';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

describe('Catálogo de médicos', () => {
  it('filtra médicos activos y no expone credenciales ni datos personales innecesarios', async () => {
    const find = jest.fn().mockResolvedValue([{
      id: 1, matricula: 1001, valorConsulta: 15000,
      usuario: {id: 2, nombres: 'Juan', apellidos: 'Perez', email: 'medico@clinica.com', clave: 'hash-privado', documento: '20000001'},
    }]);
    const service = new MedicosService({find} as unknown as Repository<Medico>);
    const response = await service.listarDisponibles();
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      where: {usuario: {estado: EstadoUsuario.ACTIVO, rol: RolUsuario.MEDICO}},
    }));
    expect(response).toEqual([{id: 1, matricula: 1001, valorConsulta: 15000, nombres: 'Juan', apellidos: 'Perez'}]);
    expect(JSON.stringify(response)).not.toContain('hash-privado');
    expect(JSON.stringify(response)).not.toContain('medico@clinica.com');
  });
});
