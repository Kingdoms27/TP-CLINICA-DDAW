import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  process.env.TZ ??= 'America/Argentina/Buenos_Aires';
  const app = await NestFactory.create(
    AppModule,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();
  const config = new DocumentBuilder().setTitle('Sistema de gestión clínica')
    .setDescription('API de turnos por rol: paciente, médico y administrador. Horarios de Argentina.')
    .setVersion('1.0').addBearerAuth().addServer('/', 'Backend directo').addServer('/api', 'Proxy nginx').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {jsonDocumentUrl: '/docs-json', swaggerOptions: {persistAuthorization: true}});

  const port =
    process.env.PORT || 3000;

  await app.listen(port, process.env.HOST || '127.0.0.1');

  console.log(
    `Servidor ejecutándose en http://localhost:${port}`,
  );
}

bootstrap();
