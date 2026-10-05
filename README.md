# TP CLÍNICA DDAW

Sistema de gestión de turnos con NestJS, TypeORM, PostgreSQL, Angular, nginx y PM2.

## Funcionalidades

| Rol | Operaciones |
| --- | --- |
| Paciente | Iniciar sesión, reservar, ver sus turnos y cancelar hasta el día anterior. |
| Médico | Consultar agenda por fecha y marcar atendido o ausente. |
| Administrador | Consultar y filtrar turnos, reservar para pacientes, cancelar antes del inicio y modificar valores de consulta. |

Solo los usuarios activos pueden ingresar. El JWT y el rol protegen las rutas y la API. La baja de usuario o cambio de rol invalida la sesión previa. Las consultas duran una hora, con inicios de 08:00 a 15:00, hasta 30 días de anticipación. El precio queda congelado al reservar. Un índice único de PostgreSQL impide dos reservas no canceladas para el mismo médico y horario; las actualizaciones de estado comprueban que el turno sigue activo.

La gestión de usuarios/roles y obras sociales queda fuera del alcance del TP. El administrador consulta pacientes activos existentes.

## Desarrollo en Windows / PowerShell

Con PostgreSQL funcionando y la base `clinica` creada, abrir dos terminales desde la raíz.

**Backend:**

```powershell
cd backend
npm ci
# Solo si no existe .env:
Copy-Item .env.example .env
# Completar DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE y JWT_SECRET.
npm run start:dev
```

Conservar `.env` si ya existe. Se usa zona Argentina por defecto. `DB_SYNCHRONIZE=true` actualiza el esquema en desarrollo; el modo producción lo desactiva. Si la configuración tiene una zona diferente, usar `TZ=America/Argentina/Buenos_Aires` para coincidir con los horarios de la clínica. `JWT_EXPIRES_IN_SECONDS` configura la duración del token; por defecto son ocho horas.

**Frontend:**

```powershell
cd frontend
npm ci
npm start
```

Abrir http://localhost:4200. El proxy de Angular reenvía `/api/` a NestJS en 3000 y elimina ese prefijo. Si se cambia PORT, ajustar `frontend/proxy.conf.json`.

**Usuarios de prueba:** dentro de backend, `npm run seed`. Clave inicial `Clinica123!`; correos `paciente1@clinica.com`, `medico1@clinica.com`, `admin@clinica.com`. El seed crea solo usuarios inexistentes y no restablece claves.

## Verificación, documentación y despliegue

- [Pruebas por rol, comandos, Swagger, Compodoc y guion del video](docs/PRUEBAS_Y_ENTREGA.md).
- [nginx + PM2 en Windows y Linux](docs/DESPLIEGUE.md).
- Swagger directo: http://localhost:3000/docs.
- Compodoc: `npm run docs --prefix frontend`, luego `npm run docs:serve --prefix frontend`; http://localhost:8081.
- nginx + PM2: http://localhost:8080, después de seguir la guía.

Las entradas y salidas de la API se validan mediante DTOs. Swagger documenta cuerpos, respuestas y autenticación. Compodoc documenta componentes, servicios y rutas de Angular. GitHub Actions incluye pruebas e2e con PostgreSQL 18 en una base independiente.

El video de 8–12 minutos, la participación con cámara y micrófono de todos los integrantes y la entrega del ZIP/enlace en el campus deben realizarse por el equipo. Antes de integrar a main, comprobar el resultado de Actions y las operaciones de los tres roles en el entorno del equipo.
