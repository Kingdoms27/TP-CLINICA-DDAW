import { Repository } from 'typeorm';
import { ReservasService } from './reservas.service';
import { Reserva } from './entities/reserva.entity';
import { Medico } from '../medicos/entities/medico.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { EstadoReserva } from '../common/enums/estado-reserva.enum';

describe('Reservas y cancelaciones de paciente', () => {
  let service: ReservasService;
  const reservas = {findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn()};
  const medicos = {findOne: jest.fn()};
  const usuarios = {findOne: jest.fn()};
  const paciente = {id: 3, rol: RolUsuario.PACIENTE, estado: EstadoUsuario.ACTIVO, nombres: 'Carlos', apellidos: 'Lopez'};
  const medico = {id: 1, matricula: 1001, valorConsulta: 15000, usuario: {estado: EstadoUsuario.ACTIVO, rol: RolUsuario.MEDICO}};
  const autenticado = {id: 3, rol: RolUsuario.PACIENTE};
  const dto = {idMedico: 1, fechaHora: '2026-10-06T09:00:00-03:00'};
  beforeEach(() => {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T10:00:00-03:00'));
    jest.clearAllMocks();
    reservas.findOne.mockResolvedValue(null);
    reservas.update.mockResolvedValue({affected: 1});
    reservas.create.mockImplementation((value) => value);
    reservas.save.mockImplementation(async (value) => ({...value,id:12}));
    medicos.findOne.mockResolvedValue(medico);
    usuarios.findOne.mockResolvedValue(paciente);
    service = new ReservasService(reservas as unknown as Repository<Reserva>, medicos as unknown as Repository<Medico>, usuarios as unknown as Repository<Usuario>);
  });
  afterEach(() => jest.useRealTimers());
  it('reserva con el paciente del JWT y congela el valor del médico', async () => {
    const result = await service.crear({...dto,idPaciente:99},autenticado);
    expect(result.paciente.id).toBe(3);
    expect(result.valorConsulta).toBe(15000);
    expect(reservas.save).toHaveBeenCalledWith(expect.objectContaining({paciente,valorConsulta:15000,estado:EstadoReserva.ACTIVO}));
  });
  it('rechaza un horario ocupado sin guardar una segunda reserva', async () => {
    reservas.findOne.mockResolvedValue({id:11});
    await expect(service.crear(dto,autenticado)).rejects.toThrow('ya tiene un turno');
    expect(reservas.save).not.toHaveBeenCalled();
  });
  it.each(['2026-10-05T09:00:00-03:00','2026-11-05T09:00:00-03:00','2026-10-06T16:00:00-03:00','2026-10-06T09:30:00-03:00','2026-10-06T09:00:00.001-03:00'])('rechaza la fecha fuera de reglas %s', async (fechaHora) => {
    await expect(service.crear({...dto,fechaHora},autenticado)).rejects.toThrow();
    expect(reservas.save).not.toHaveBeenCalled();
  });
  it('rechaza un médico dado de baja aunque el cliente conserve su selección', async () => {
    medicos.findOne.mockResolvedValue({...medico,usuario:{...medico.usuario,estado:EstadoUsuario.BAJA}});
    await expect(service.crear(dto,autenticado)).rejects.toThrow('no está disponible');
  });
  function reserva(overrides = {}) {
    return {id:12,paciente,medico,fechaHora:new Date(dto.fechaHora),estado:EstadoReserva.ACTIVO,valorConsulta:15000,...overrides};
  }
  it('cancela el día anterior y conserva el importe', async () => {
    reservas.findOne.mockResolvedValue(reserva());
    const result = await service.cancelarComoPaciente(12,3);
    expect(result.estado).toBe(EstadoReserva.CANCELADO);
    expect(result.valorConsulta).toBe(15000);
  });
  it('rechaza cancelar un turno de otro paciente', async () => {
    reservas.findOne.mockResolvedValue(reserva());
    await expect(service.cancelarComoPaciente(12,99)).rejects.toThrow('otro paciente');
    expect(reservas.save).not.toHaveBeenCalled();
  });
  it('rechaza cancelar desde la medianoche del día de la consulta', async () => {
    jest.setSystemTime(new Date('2026-10-06T00:00:00-03:00'));
    reservas.findOne.mockResolvedValue(reserva());
    await expect(service.cancelarComoPaciente(12,3)).rejects.toThrow('día anterior');
    expect(reservas.save).not.toHaveBeenCalled();
  });
  it('rechaza cancelar una reserva ya cancelada', async () => {
    reservas.findOne.mockResolvedValue(reserva({estado:EstadoReserva.CANCELADO}));
    await expect(service.cancelarComoPaciente(12,3)).rejects.toThrow('no se encuentra activa');
  });
});
