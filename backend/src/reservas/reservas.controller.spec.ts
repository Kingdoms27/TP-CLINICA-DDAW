import { INestApplication, ValidationPipe, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('API de reserva y cancelación de paciente', () => {
  let app: INestApplication;
  const response = {id:12,fechaHora:'2026-10-06T12:00:00.000Z',estado:'ACTIVO',valorConsulta:15000};
  const service = {crear:jest.fn(),cancelarComoPaciente:jest.fn()};
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers:[ReservasController], providers:[{provide:ReservasService,useValue:service},RolesGuard],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate(context:ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const rol = req.headers['x-test-rol'];
        if(!rol) throw new UnauthorizedException();
        req.user = {id:3,rol};
        return true;
      },
    }).compile();
    app=module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
    await app.init();
  });
  beforeEach(()=>{
    jest.clearAllMocks();
    service.crear.mockResolvedValue(response);
    service.cancelarComoPaciente.mockResolvedValue({...response,estado:'CANCELADO'});
  });
  afterAll(async()=>{await app.close();});
  it('pasa el paciente autenticado al servicio y permite cancelar por id', async()=>{
    await request(app.getHttpServer()).post('/reservas').set('x-test-rol','PACIENTE').send({idMedico:1,fechaHora:response.fechaHora}).expect(201);
    expect(service.crear).toHaveBeenCalledWith(expect.objectContaining({idMedico:1}),{id:3,rol:'PACIENTE'});
    await request(app.getHttpServer()).patch('/reservas/12/cancelar').set('x-test-rol','PACIENTE').send({}).expect(200);
    expect(service.cancelarComoPaciente).toHaveBeenCalledWith(12,3);
  });
  it.each([
    {idMedico:'1',fechaHora:response.fechaHora},
    {idMedico:0,fechaHora:response.fechaHora},
    {idMedico:1,fechaHora:'2026-02-30T09:00:00-03:00'},
    {idMedico:1,fechaHora:response.fechaHora,valorConsulta:1},
  ])('rechaza un cuerpo inválido antes de llamar al servicio: %j', async(body)=>{
    await request(app.getHttpServer()).post('/reservas').set('x-test-rol','PACIENTE').send(body).expect(400);
    expect(service.crear).not.toHaveBeenCalled();
  });
  it('protege la reserva y la cancelación por rol y valida el id', async()=>{
    await request(app.getHttpServer()).post('/reservas').send({idMedico:1,fechaHora:response.fechaHora}).expect(401);
    await request(app.getHttpServer()).post('/reservas').set('x-test-rol','MEDICO').send({idMedico:1,fechaHora:response.fechaHora}).expect(403);
    await request(app.getHttpServer()).patch('/reservas/12/cancelar').set('x-test-rol','MEDICO').expect(403);
    await request(app.getHttpServer()).patch('/reservas/texto/cancelar').set('x-test-rol','PACIENTE').expect(400);
    expect(service.crear).not.toHaveBeenCalled();
    expect(service.cancelarComoPaciente).not.toHaveBeenCalled();
  });
});
