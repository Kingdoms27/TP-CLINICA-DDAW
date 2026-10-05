# Verificación y entrega del TP

## Usuarios de demostración

Con la base local `clinica` configurada en `backend/.env`, ejecutar una vez `npm run seed` dentro de backend. El seed crea usuarios que no existan y no cambia claves existentes.

| Rol | Correo | Contraseña inicial |
| --- | --- | --- |
| Paciente | paciente1@clinica.com | Clinica123! |
| Otro paciente | paciente2@clinica.com | Clinica123! |
| Médico | medico1@clinica.com | Clinica123! |
| Otro médico | medico2@clinica.com | Clinica123! |
| Administrador | admin@clinica.com | Clinica123! |

Estas cuentas son para demostración. La gestión de altas, bajas y roles queda fuera del alcance de la consigna.

## Operaciones para verificar y mostrar

| Rol | Prueba | Resultado esperado |
| --- | --- | --- |
| Todos | Clave incorrecta, campos vacíos o email inválido | Se informa el error sin crear una sesión. |
| Todos | Abrir login en escritorio y celular | Logo y formulario visibles, sin desplazamiento horizontal. |
| Todos | Usar la indicación de scroll y volver al acceso | Se muestran los tres roles y se puede regresar al formulario. |
| Todos | Activar reducción de movimiento en el dispositivo | El contenido aparece sin animaciones. |
| Todos | Cerrar sesión y volver a una ruta protegida | Se muestra el login. |
| Paciente | Reservar médico, fecha y hora futuros | Reserva confirmada, con el precio fijado por el backend. |
| Paciente | Volver a reservar el mismo médico y horario | Rechazo por horario ocupado. |
| Paciente | Reservar fuera de 08:00–15:00 o a más de 30 días | Rechazo; las consultas duran una hora y terminan como máximo a las 16:00. |
| Paciente | Consultar Mis turnos | Solo las reservas del paciente autenticado. |
| Paciente | Cancelar una reserva futura y confirmar | Estado Cancelado. El horario vuelve a poder reservarse. |
| Paciente | Cancelar el día de la consulta | Rechazo, incluso si la consulta todavía no empezó. |
| Médico | Consultar agenda para una fecha | Solo sus turnos de esa fecha, sin cancelados. |
| Médico | Marcar una reserva activa como atendido o ausente | Se actualiza el estado y desaparecen las acciones de esa reserva. |
| Médico | Intentar modificar un turno de otro médico | Rechazo del servidor. |
| Administrador | Filtrar turnos por fecha, paciente, DNI o médico | El listado se ajusta a los filtros. |
| Administrador | Reservar para un paciente activo | La reserva pertenece al paciente seleccionado. |
| Administrador | Cancelar una reserva antes del inicio | Cancelación permitida, también en el mismo día. |
| Administrador | Cancelar una reserva que ya comenzó | Rechazo. |
| Administrador | Cambiar el valor de consulta | Los nuevos turnos usan el nuevo precio; los anteriores mantienen su precio reservado. |

Para una prueba de usuario inactivo, cambiar únicamente el estado de una cuenta de demostración en pgAdmin, intentar ingresar y restaurar el estado al terminar. El backend también rechaza tokens emitidos antes de la baja o de un cambio de rol.

## Pruebas automáticas

Desde la raíz del proyecto:

```powershell
npm test --prefix frontend -- --watch=false
npm run build --prefix frontend
npm run docs --prefix frontend
npm test --prefix backend -- --runInBand
npm run build --prefix backend
```

Las pruebas unitarias y de controllers usan respuestas o repositorios simulados. Las pruebas e2e usan PostgreSQL real y JWT real; necesitan una base independiente cuyo nombre termine en `_test`.

En pgAdmin crear `clinica_test`. En una nueva terminal PowerShell de backend, usando los datos de TU PostgreSQL:

```powershell
$env:DB_DATABASE = 'clinica_test'
$env:DB_SYNCHRONIZE = 'true'
npm run test:e2e
Remove-Item Env:DB_DATABASE
Remove-Item Env:DB_SYNCHRONIZE
```

Nunca usar `clinica` para las pruebas e2e. El script se niega a arrancar si el nombre no termina en `_test`. Crea usuarios propios y elimina solo sus registros de prueba al terminar. No hay que ejecutar el seed en esa base.

GitHub Actions ejecuta compilación, pruebas unitarias, e2e con PostgreSQL 18, generación de Compodoc y una prueba del conjunto servido mediante nginx + PM2. También verifica el login en Chrome en cinco tamaños, movimiento reducido, contraseña visible, error recuperable, ingreso y cierre de sesión; comprueba los tres roles en escritorio y móvil, reservas y cancelaciones reales, cambios de precio con importe congelado y registro de atendido/ausente; guarda las capturas en el artefacto `vistas-clinica`. El resultado del workflow debe comprobarse en la pestaña Actions del repositorio.

## Documentación

- Swagger en desarrollo: http://localhost:3000/docs
- Swagger con nginx: http://localhost:8080/docs/; seleccionar el servidor `/api` en Swagger.
- En Swagger, ejecutar `POST /auth/login`, copiar `accessToken` y pegarlo en Authorize, sin escribir la palabra Bearer.
- Compodoc: `npm run docs --prefix frontend`, luego `npm run docs:serve --prefix frontend`; abrir http://localhost:8081.
- Los DTOs de entrada se validan con ValidationPipe. Los DTOs de respuesta se validan antes de salir con ValidateResponseInterceptor; una respuesta con formato incorrecto o campos inesperados genera un error 500 sin exponer datos privados.

## Guion del video, entre 8 y 12 minutos

Completar nombres, apellidos y contribuciones reales de los 5–6 integrantes. Todos deben intervenir con cámara y micrófono, mostrando sus aportes mientras manipulan el sistema.

| Tiempo orientativo | Contenido |
| --- | --- |
| 0:00–1:00 | Presentación del equipo, objetivo y tecnologías. |
| 1:00–3:30 | Paciente: login, reserva, lista y cancelación; ejemplo de horario ocupado. |
| 3:30–5:00 | Médico: agenda por fecha, marcar atendido y ausente. |
| 5:00–7:00 | Administrador: reserva para paciente, cancelación y cambio de precio con conservación del valor anterior. |
| 7:00–8:30 | Validaciones y acceso por rol, Swagger y Compodoc. |
| 8:30–10:00 | Sistema abierto mediante nginx en 8080 y proceso backend administrado por PM2; mostrar `pm2 status` y la configuración nginx. |
| 10:00–11:00 | Aportes de integrantes que falten y cierre. |

La consigna exige entregar un ZIP con el código y el enlace al video. No incluir `.env`, contraseñas de PostgreSQL, `node_modules`, archivos temporales, logs ni bases de datos. Con el trabajo integrado en main se puede generar el ZIP de fuentes:

```powershell
git archive --format=zip --output=TP-CLINICA-DDAW.zip main
```

Agregar al ZIP un archivo `VIDEO.txt` con el enlace real del video y verificar que el docente pueda abrirlo. El video, sus participantes y la entrega en el campus deben completarse por el equipo.
