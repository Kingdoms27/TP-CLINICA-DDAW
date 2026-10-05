import { INestApplication, ValidationPipe, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MedicosController } from './medicos.controller';
import { MedicosService } from './medicos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('GET /medicos', () => {
  let app: INestApplication;
  const medicos = [{id: 1, matricula: 1001, valorConsulta: 15000, nombres: 'Juan', apellidos: 'Perez'}];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MedicosController],
      providers: [{provide: MedicosService, useValue: {listarDisponibles: jest.fn().mockResolvedValue(medicos)}}, RolesGuard],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const rol = req.headers['x-test-rol'];
        if (!rol) throw new UnauthorizedException();
        req.user = {id: 3, rol};
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}));
    await app.init();
  });
  afterAll(async () => {await app.close();});
  it.each(['PACIENTE', 'ADMINISTRADOR'])('permite consultar a %s', async (rol) => {
    await request(app.getHttpServer()).get('/medicos').set('x-test-rol',rol).expect(200).expect(medicos);
  });
  it('rechaza al médico y a una solicitud sin autenticar', async () => {
    await request(app.getHttpServer()).get('/medicos').set('x-test-rol','MEDICO').expect(403);
    await request(app.getHttpServer()).get('/medicos').expect(401);
  });
});
