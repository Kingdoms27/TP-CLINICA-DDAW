import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './app.module';

import { Usuario } from './usuarios/entities/usuario.entity';
import { Medico } from './medicos/entities/medico.entity';

import { EstadoUsuario } from './common/enums/estado-usuario.enum';
import { RolUsuario } from './common/enums/rol-usuario.enum';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usuarioRepository = app.get<Repository<Usuario>>(
    getRepositoryToken(Usuario),
  );

  const medicoRepository = app.get<Repository<Medico>>(
    getRepositoryToken(Medico),
  );

  const claveHash = await bcrypt.hash('Clinica123!', 10);

  async function crearUsuarioSiNoExiste(datos: {
    documento: string;
    apellidos: string;
    nombres: string;
    email: string;
    rol: RolUsuario;
  }) {
    let usuario = await usuarioRepository.findOne({
      where: {
        documento: datos.documento,
      },
    });

    if (!usuario) {
      usuario = usuarioRepository.create({
        documento: datos.documento,
        apellidos: datos.apellidos,
        nombres: datos.nombres,
        email: datos.email,
        clave: claveHash,
        estado: EstadoUsuario.ACTIVO,
        rol: datos.rol,
      });

      usuario = await usuarioRepository.save(usuario);

      console.log(
        `Usuario creado: ${usuario.email} - ${usuario.rol}`,
      );
    }

    return usuario;
  }

  const administrador = await crearUsuarioSiNoExiste({
    documento: '10000001',
    apellidos: 'Administrador',
    nombres: 'Sistema',
    email: 'admin@clinica.com',
    rol: RolUsuario.ADMINISTRADOR,
  });

  const usuarioMedico1 = await crearUsuarioSiNoExiste({
    documento: '20000001',
    apellidos: 'Perez',
    nombres: 'Juan',
    email: 'medico1@clinica.com',
    rol: RolUsuario.MEDICO,
  });

  const usuarioMedico2 = await crearUsuarioSiNoExiste({
    documento: '20000002',
    apellidos: 'Gomez',
    nombres: 'Laura',
    email: 'medico2@clinica.com',
    rol: RolUsuario.MEDICO,
  });

  const paciente1 = await crearUsuarioSiNoExiste({
    documento: '30000001',
    apellidos: 'Lopez',
    nombres: 'Carlos',
    email: 'paciente1@clinica.com',
    rol: RolUsuario.PACIENTE,
  });

  const paciente2 = await crearUsuarioSiNoExiste({
    documento: '30000002',
    apellidos: 'Martinez',
    nombres: 'Ana',
    email: 'paciente2@clinica.com',
    rol: RolUsuario.PACIENTE,
  });

  const medico1Existente = await medicoRepository.findOne({
    where: {
      matricula: 1001,
    },
  });

  if (!medico1Existente) {
    const medico1 = medicoRepository.create({
      usuario: usuarioMedico1,
      matricula: 1001,
      valorConsulta: 15000,
    });

    await medicoRepository.save(medico1);

    console.log('Médico 1 creado');
  }

  const medico2Existente = await medicoRepository.findOne({
    where: {
      matricula: 1002,
    },
  });

  if (!medico2Existente) {
    const medico2 = medicoRepository.create({
      usuario: usuarioMedico2,
      matricula: 1002,
      valorConsulta: 18000,
    });

    await medicoRepository.save(medico2);

    console.log('Médico 2 creado');
  }

  console.log('');
  console.log('=================================');
  console.log('SEED FINALIZADO');
  console.log('=================================');
  console.log('Administrador:', administrador.email);
  console.log('Paciente 1:', paciente1.email);
  console.log('Paciente 2:', paciente2.email);
  console.log('');
  console.log('Contraseña de prueba: Clinica123!');
  console.log('=================================');

  await app.close();
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error ejecutando seed:', error);
    process.exit(1);
  });