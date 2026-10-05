# Clínica — Sistema de gestión de turnos

**Trabajo Práctico de Desarrollo de Aplicaciones Web · Grupo K**

## Introducción

Aplicación web para administrar los turnos de una clínica, desarrollada a partir de la consigna del trabajo práctico. El sistema permite que los pacientes reserven sus consultas, que los médicos organicen su agenda y registren la atención, y que el administrador gestione las reservas y los valores de consulta.

La solución integra una interfaz en Angular, una API en NestJS y una base de datos PostgreSQL mediante TypeORM. Incluye autenticación, permisos por rol, validación de datos, documentación técnica y configuración de despliegue con nginx y PM2.

## Integrantes

**Grupo K**

- Kevin Berthet.

## Funcionalidades por rol

| Rol | Funcionalidades |
| --- | --- |
| Paciente | Iniciar sesión, consultar médicos y horarios disponibles, reservar un turno, visualizar sus reservas y cancelar hasta el día anterior a la consulta. |
| Médico | Consultar su agenda por fecha, visualizar los datos del paciente y registrar un turno como atendido o ausente. |
| Administrador | Consultar y filtrar reservas por fecha y paciente, reservar para pacientes existentes, cancelar antes del inicio del turno y modificar el valor de consulta de los médicos. |

Cada rol cuenta con su propia pantalla y sus operaciones autorizadas. La interfaz se adapta a computadoras y dispositivos móviles e incorpora confirmaciones, mensajes de validación y estados de carga.

## Reglas de funcionamiento

- Solo pueden ingresar usuarios activos con credenciales válidas.
- Las consultas duran una hora, dentro de la franja de atención de 08:00 a 16:00. Los horarios de inicio van de 08:00 a 15:00.
- Se pueden reservar turnos con hasta 30 días de anticipación.
- Un médico no puede tener dos reservas vigentes para el mismo día y horario. La base de datos también controla esta restricción.
- El valor de consulta se conserva al momento de reservar. Un cambio posterior de precio no modifica reservas existentes.
- Los turnos pueden estar activos, atendidos, ausentes o cancelados.
- La cancelación respeta los plazos correspondientes a cada rol y solo se aplica sobre turnos activos.
- Los horarios se interpretan en la zona `America/Argentina/Buenos_Aires`.

La gestión de altas, bajas y roles de usuarios queda fuera del alcance de esta etapa, según la consigna. El sistema utiliza usuarios existentes y no contempla la gestión de obras sociales.

## Modelo de datos

| Entidad | Información principal |
| --- | --- |
| Usuarios | Documento, apellidos, nombres, correo, contraseña protegida, estado y rol. |
| Médicos | Usuario asociado, matrícula y valor de consulta. |
| Reservas | Médico, paciente, fecha y hora, estado y valor de consulta registrado al reservar. |

Cada médico se vincula con un usuario. Las reservas relacionan al médico con el usuario paciente y permiten conservar el historial de las consultas.

## Tecnologías y requisitos de la consigna

| Requisito | Implementación |
| --- | --- |
| Backend con NestJS | API organizada en módulos, controladores y servicios para autenticación, usuarios, médicos y reservas. |
| Persistencia con TypeORM y PostgreSQL | Entidades, relaciones, consultas y control de reservas duplicadas en la base de datos. |
| Frontend con Angular | Inicio de sesión y vistas de paciente, médico y administrador, con rutas protegidas. |
| Validación de entradas y salidas | DTOs y validaciones mediante `class-validator` y `class-transformer`, aplicadas a solicitudes y respuestas de la API. |
| Configuración del entorno | Variables del backend en `.env` y proxy de desarrollo de Angular para utilizar rutas relativas a `/api/`. |
| Documentación | Swagger para la API y Compodoc para los componentes, servicios y rutas del frontend. |
| Despliegue con nginx y PM2 | nginx sirve el frontend y redirige las solicitudes a la API; PM2 administra el proceso del backend. |

La autenticación utiliza JWT y las contraseñas se almacenan mediante bcrypt. La API verifica el estado del usuario y su rol en las solicitudes protegidas; una baja o un cambio de rol invalida el acceso con la sesión anterior.

## Instalación y ejecución en desarrollo

Se requiere Node.js compatible con las versiones del proyecto, npm y PostgreSQL en funcionamiento. Crear previamente la base de datos `clinica`. Los siguientes comandos se ejecutan desde la raíz del repositorio en PowerShell.

Instalar las dependencias:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
```

Crear `backend/.env` a partir del archivo de ejemplo, únicamente si todavía no existe:

```powershell
if (-not (Test-Path backend/.env)) {
    Copy-Item backend/.env.example backend/.env
}
```

Completar `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` y `JWT_SECRET` con la configuración local. El archivo `.env` no se incluye en el repositorio. En desarrollo, `DB_SYNCHRONIZE=true` permite actualizar el esquema; en producción se desactiva. La duración del token se configura mediante `JWT_EXPIRES_IN_SECONDS`, con ocho horas como valor predeterminado.

Iniciar el backend en una terminal:

```powershell
npm run start:dev --prefix backend
```

Iniciar el frontend en otra terminal:

```powershell
npm start --prefix frontend
```

Acceder a [http://localhost:4200](http://localhost:4200). El proxy de Angular envía las solicitudes de `/api/` al backend en el puerto 3000. Si se modifica el puerto del backend, ajustar `frontend/proxy.conf.json`.

## Datos de prueba

Con la base de datos configurada, cargar los usuarios de ejemplo:

```powershell
npm run seed --prefix backend
```

| Rol | Correo | Contraseña inicial |
| --- | --- | --- |
| Paciente | `paciente1@clinica.com` | `Clinica123!` |
| Médico | `medico1@clinica.com` | `Clinica123!` |
| Administrador | `admin@clinica.com` | `Clinica123!` |

Estos datos se utilizan para pruebas locales. La carga crea los usuarios que no existen y no restablece las contraseñas de usuarios existentes.

## Documentación y despliegue

Swagger se encuentra en [http://localhost:3000/docs](http://localhost:3000/docs) durante el desarrollo. Documenta los endpoints, cuerpos de las solicitudes, respuestas y autenticación de la API.

Para generar y consultar la documentación de Angular:

```powershell
npm run docs --prefix frontend
npm run docs:serve --prefix frontend
```

Compodoc queda disponible en [http://localhost:8081](http://localhost:8081).

La [guía de despliegue](docs/DESPLIEGUE.md) contiene la configuración y los comandos para ejecutar el sistema con nginx y PM2 en Windows y Linux. En ese entorno, la aplicación se sirve en [http://localhost:8080](http://localhost:8080), la API se accede mediante `/api/` y Swagger mediante `/docs/`.

## Verificación del proyecto

El repositorio incluye pruebas unitarias del backend, pruebas de integración con PostgreSQL y pruebas del frontend. GitHub Actions automatiza la ejecución de pruebas, compilaciones y verificaciones del despliegue.

Para ejecutar las pruebas unitarias y compilar ambos proyectos:

```powershell
npm test --prefix backend -- --runInBand
npm test --prefix frontend -- --watch=false
npm run build --prefix backend
npm run build --prefix frontend
```

Las pruebas de integración se ejecutan con `npm run test:e2e --prefix backend` y requieren la configuración de una base independiente de pruebas.
