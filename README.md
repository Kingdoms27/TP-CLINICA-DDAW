# TP CLÍNICA DDAW

Sistema de gestión de turnos con NestJS, TypeORM, PostgreSQL y Angular.

## Avance de la etapa 4.7

El login envía `email` y `clave` a `POST /auth/login`, conserva el JWT y el usuario en `sessionStorage` y redirige a `/paciente`, `/medico` o `/administrador`. La sesión se mantiene al recargar en la misma pestaña. No se guarda la contraseña.

El interceptor agrega `Authorization: Bearer ...` únicamente a rutas relativas `/api/`. Los guards comprueban la sesión y el rol antes de entrar a cada área. Una respuesta 401 en una operación protegida limpia la sesión y devuelve al login; los permisos y la firma del JWT los valida NestJS.

El área de pacientes carga `GET /reservas/mis-turnos`: fecha y hora, médico, matrícula, precio reservado y estado, con carga, lista vacía, error y reintento. Las áreas de médico y administrador tienen su entrada protegida, pero todavía no incluyen operaciones.

## Ejecutar en Windows / PowerShell

Desde la raíz del repositorio, abrir dos terminales.

**Terminal 1 — backend:**

```powershell
cd backend
npm ci
# Solo si todavía no existe .env:
Copy-Item .env.example .env
# Completar .env con la conexión PostgreSQL y el secreto JWT.
npm run start:dev
```

La base `clinica` y PostgreSQL deben estar disponibles. Si ya existe `.env`, conservarlo. El proxy está configurado para el puerto 3000; si se cambia PORT, ajustar el destino en `frontend/proxy.conf.json`.

**Terminal 2 — frontend:**

```powershell
cd frontend
npm ci
npm start
```

Abrir <http://localhost:4200>. El navegador solicita `/api/auth/login` y `/api/reservas/mis-turnos`; el proxy elimina `/api` antes de reenviar a NestJS. No se necesita configurar CORS para este flujo de desarrollo.

El seed existente crea usuarios de prueba, si aún no existen:

```powershell
# En una terminal dentro de backend, con .env configurado:
npm run seed
```

| Rol | Correo del seed | Contraseña inicial |
| --- | --- | --- |
| Paciente | paciente1@clinica.com | Clinica123! |
| Médico | medico1@clinica.com | Clinica123! |
| Administrador | admin@clinica.com | Clinica123! |

El seed no cambia la contraseña de usuarios existentes. Estas credenciales son para desarrollo.

## Verificar esta etapa

```powershell
cd frontend
npm test -- --watch=false
npm run build
```

Las pruebas cubren login por rol, persistencia, rechazo de credenciales/respuestas inválidas, sesión vencida, interceptor, 401/403, rutas por rol y carga/reintento de turnos. El presupuesto de CSS por componente se ajustó a 10 kB de advertencia y 12 kB de error para admitir el diseño de login existente, que ya superaba el límite anterior. El presupuesto inicial de JavaScript se conserva.

Para probar con la base real: ingresar con un usuario activo, comprobar su área, recargar, cerrar sesión y verificar que un paciente no puede entrar al área de administrador. En “Mis turnos” se verá una lista vacía si el usuario no tiene reservas.

## Próximas etapas

1. Reservar y cancelar turnos desde el área paciente.
2. Agenda por fecha y marcar atendido/ausente desde el área médico.
3. Reservas, cancelaciones y valor de consulta desde el área administrador.
4. DTOs de salida, Swagger y Compodoc según la rúbrica.
5. nginx y PM2, pruebas completas y video de entrega.

En producción nginx deberá servir Angular y reenviar `/api/` al backend eliminando ese prefijo. El proxy de Angular solo funciona durante `ng serve`.
