import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { Medico } from '../src/medicos/entities/medico.entity';
import { Reserva } from '../src/reservas/entities/reserva.entity';
import { EstadoUsuario } from '../src/common/enums/estado-usuario.enum';
import { RolUsuario } from '../src/common/enums/rol-usuario.enum';

if (!process.env.DB_DATABASE?.endsWith('_test')) {
  throw new Error('Las pruebas e2e requieren una base separada cuyo nombre termine en _test. No usar la base clinica.');
}
process.env.TZ='America/Argentina/Buenos_Aires';

describe('Clínica con PostgreSQL y JWT reales',()=>{
  let app:INestApplication;let usuarios:Repository<Usuario>;let medicos:Repository<Medico>;let reservas:Repository<Reserva>;
  const personas:Usuario[]=[];const profesionales:Medico[]=[];const tokens:Record<string,string>={};
  let reservaId:number;let primerPrecio=15000;
  const fecha=new Date();fecha.setDate(fecha.getDate()+2);fecha.setHours(9,0,0,0);
  const dia=`${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
  const fechaHora=fecha.toISOString();
  beforeAll(async()=>{
    const module=await Test.createTestingModule({imports:[AppModule]}).compile();
    app=module.createNestApplication();app.useLogger(false);app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.init();
    usuarios=app.get(getRepositoryToken(Usuario));medicos=app.get(getRepositoryToken(Medico));reservas=app.get(getRepositoryToken(Reserva));
    const clave=await bcrypt.hash('Clinica123!',4);const tag=Date.now().toString();
    const roles=[RolUsuario.PACIENTE,RolUsuario.ADMINISTRADOR,RolUsuario.MEDICO,RolUsuario.PACIENTE,RolUsuario.MEDICO];
    for(const [index,rol] of roles.entries()){
      const persona=await usuarios.save(usuarios.create({documento:`${tag}${index}`,nombres:`Prueba${index}`,apellidos:'Integración',email:`clinica-${tag}-${index}@example.com`,clave,rol,estado:EstadoUsuario.ACTIVO}));personas.push(persona);
      const login=await request(app.getHttpServer()).post('/auth/login').send({email:persona.email,clave:'Clinica123!'}).expect(200);tokens[String(index)]=login.body.accessToken;
    }
    for(const index of [2,4]) profesionales.push(await medicos.save(medicos.create({usuario:personas[index],matricula:Number(tag.slice(-7))+index,valorConsulta:primerPrecio})));
  },60000);
  afterAll(async()=>{
    if(profesionales.length){await reservas.createQueryBuilder().delete().where('id_medico IN (:...ids)',{ids:profesionales.map(m=>m.id)}).execute();await medicos.delete(profesionales.map(m=>m.id));}
    if(personas.length) await usuarios.delete(personas.map(p=>p.id));
    if(app) await app.close();
  });
  const api=()=>app.getHttpServer();
  const bearer=(index:string)=>`Bearer ${tokens[index]}`;
  it('rechaza contraseña incorrecta y token ausente',async()=>{
    await request(api()).post('/auth/login').send({email:personas[0].email,clave:'incorrecta'}).expect(401);
    await request(api()).get('/reservas/admin').expect(401);
    await request(api()).get('/usuarios/pacientes').set('Authorization',bearer('0')).expect(403);
  });
  it('reserva como paciente sin permitir cambiar el propietario',async()=>{
    const response=await request(api()).post('/reservas').set('Authorization',bearer('0')).send({idMedico:profesionales[0].id,idPaciente:personas[3].id,fechaHora}).expect(201);
    reservaId=response.body.id;expect(response.body.paciente.id).toBe(personas[0].id);expect(response.body.valorConsulta).toBe(primerPrecio);
    const lista=await request(api()).get('/reservas/mis-turnos').set('Authorization',bearer('0')).expect(200);expect(lista.body.some((r:{id:number})=>r.id===reservaId)).toBe(true);
  });
  it('el administrador modifica el precio sin alterar una reserva anterior',async()=>{
    await request(api()).patch(`/medicos/${profesionales[0].id}/valor-consulta`).set('Authorization',bearer('1')).send({valorConsulta:18000}).expect(200);
    const lista=await request(api()).get('/reservas/admin').set('Authorization',bearer('1')).expect(200);
    expect(lista.body.find((r:{id:number})=>r.id===reservaId).valorConsulta).toBe(primerPrecio);
    await request(api()).post('/reservas').set('Authorization',bearer('0')).send({idMedico:profesionales[0].id,fechaHora}).expect(400);
  });
  it('el médico consulta por fecha y solo modifica sus propios turnos',async()=>{
    const agenda=await request(api()).get('/reservas/medico').query({fecha:dia}).set('Authorization',bearer('2')).expect(200);expect(agenda.body.some((r:{id:number})=>r.id===reservaId)).toBe(true);
    await request(api()).patch(`/reservas/${reservaId}/atendido`).set('Authorization',bearer('4')).expect(403);
    await request(api()).patch(`/reservas/${reservaId}/atendido`).set('Authorization',bearer('2')).expect(200);
    await request(api()).patch(`/reservas/${reservaId}/ausente`).set('Authorization',bearer('2')).expect(400);
  });
  it('el administrador reserva para otro paciente y puede cancelar antes del inicio',async()=>{
    const otra=new Date(fecha);otra.setHours(10);
    const response=await request(api()).post('/reservas').set('Authorization',bearer('1')).send({idMedico:profesionales[0].id,idPaciente:personas[3].id,fechaHora:otra.toISOString()}).expect(201);
    expect(response.body.valorConsulta).toBe(18000);
    await request(api()).patch(`/reservas/${response.body.id}/cancelar`).set('Authorization',bearer('0')).expect(403);
    await request(api()).patch(`/reservas/${response.body.id}/cancelar-admin`).set('Authorization',bearer('1')).expect(200);
  });
  it('evita doble reserva concurrente del mismo médico y horario',async()=>{
    const otra=new Date(fecha);otra.setHours(11);
    const responses=await Promise.all([0,3].map(index=>request(api()).post('/reservas').set('Authorization',bearer(String(index))).send({idMedico:profesionales[0].id,fechaHora:otra.toISOString()})));
    expect(responses.map(r=>r.status).sort()).toEqual([201,400]);
  });
  it('permite cancelar un turno propio futuro y volver a reservar el horario',async()=>{
    const otra=new Date(fecha);otra.setHours(12);const body={idMedico:profesionales[0].id,fechaHora:otra.toISOString()};
    const response=await request(api()).post('/reservas').set('Authorization',bearer('0')).send(body).expect(201);
    await request(api()).patch(`/reservas/${response.body.id}/cancelar`).set('Authorization',bearer('0')).expect(200);
    const nueva=await request(api()).post('/reservas').set('Authorization',bearer('0')).send(body).expect(201);
    const resultado=await request(api()).patch(`/reservas/${nueva.body.id}/ausente`).set('Authorization',bearer('2')).expect(200);expect(resultado.body.estado).toBe('AUSENTE');
  });
  it('inhabilita el inicio y un token previo cuando el usuario pasa a baja',async()=>{
    await usuarios.update(personas[3].id,{estado:EstadoUsuario.BAJA});
    await request(api()).post('/auth/login').send({email:personas[3].email,clave:'Clinica123!'}).expect(401);
    await request(api()).get('/reservas/mis-turnos').set('Authorization',bearer('3')).expect(401);
  });
});
