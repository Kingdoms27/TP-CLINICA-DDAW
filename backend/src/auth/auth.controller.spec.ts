import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

describe('POST /auth/login',()=>{
  it('valida entrada y salida, sin devolver contraseñas',async()=>{
    const token=new JwtService({secret:'prueba'}).sign({sub:3,rol:'PACIENTE'});
    const login=jest.fn().mockResolvedValue({accessToken:token,usuario:{id:3,documento:'30000001',nombres:'Carlos',apellidos:'Lopez',email:'paciente@clinica.com',estado:'ACTIVO',rol:'PACIENTE'}});
    const module=await Test.createTestingModule({controllers:[AuthController],providers:[{provide:AuthService,useValue:{login}}]}).overrideGuard(JwtAuthGuard).useValue({canActivate:()=>true}).compile();
    const app=module.createNestApplication();app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.init();
    try{
      await request(app.getHttpServer()).post('/auth/login').send({email:'incorrecto',clave:'123'}).expect(400);
      const response=await request(app.getHttpServer()).post('/auth/login').send({email:'paciente@clinica.com',clave:'Clinica123!'}).expect(200);
      expect(response.body.usuario).not.toHaveProperty('clave');
      login.mockResolvedValue({accessToken:token,usuario:{id:3,clave:'hash-privado'}});
      await request(app.getHttpServer()).post('/auth/login').send({email:'paciente@clinica.com',clave:'Clinica123!'}).expect(500);
    }finally{await app.close();}
  });
});
