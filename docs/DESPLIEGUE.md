# nginx + PM2

Este flujo demuestra las tecnologías requeridas sin reemplazar tus servidores de desarrollo: backend con PM2 en 3001 y nginx en 8080 sirviendo Angular compilado. Usa la base PostgreSQL ya configurada y su esquema actualizado previamente en desarrollo.

## Preparar el proyecto

Desde la raíz:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
npm run build --prefix backend
npm run build --prefix frontend
node deploy/generar-nginx.cjs
```

El generador escribe `deploy/runtime/nginx.conf` con la ruta absoluta de TU carpeta, incluso si tiene espacios. Esa carpeta y los logs no se suben a GitHub. El ejemplo Linux está en `deploy/nginx.conf.example`.

Antes de iniciar PM2, ejecutar el backend actualizado en desarrollo al menos una vez: el índice único que evita reservas simultáneas debe existir en PostgreSQL. El modo de producción no sincroniza el esquema automáticamente. En un servidor nuevo, preparar el esquema con una ejecución de desarrollo y luego detenerla; no habilitar sincronización automática permanente en producción.

Si ya existen reservas duplicadas activas para el mismo médico y horario, la creación del índice fallará. Resolver los duplicados revisando los registros en pgAdmin antes de continuar; no borrar reservas sin identificar cuál corresponde.

## Iniciar el backend con PM2

```powershell
cd backend
npm run pm2:start
npm run pm2:status
```

Debe aparecer `clinica-api` como online. La entrada es `backend/dist/main.js`, con carpeta de trabajo backend para leer `.env`. PM2 fija `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=3001`, la zona Argentina y `DB_SYNCHRONIZE=false`.

```powershell
npm run pm2:logs
# Ctrl+C sale de la vista de logs sin detener el backend.
npm run pm2:stop
```

Para reiniciar después de una compilación: `npx pm2 restart clinica-api --update-env`. PM2 está incluido como herramienta de desarrollo; no hace falta instalarlo globalmente para la demo.

## nginx en Windows

Descargar nginx/Windows desde la página oficial https://nginx.org/en/download.html y extraer el ZIP. Ubicar `nginx.exe`; no editar la configuración estándar de esa instalación.

Desde la raíz del TP, ajustar solo la ruta de nginx.exe a la carpeta donde lo extrajiste:

```powershell
$nginxExe = 'C:\nginx\nginx.exe'
$nginxPrefix = ((Resolve-Path '.\deploy\runtime').Path -replace '\\','/') + '/'
& $nginxExe -p $nginxPrefix -c nginx.conf -t
& $nginxExe -p $nginxPrefix -c nginx.conf
```

`-t` debe informar que la sintaxis es correcta. Abrir http://localhost:8080 y probar los tres roles. En este flujo no hace falta `ng serve`: nginx sirve el build de Angular y reenvía `/api/` al backend 3001 eliminando ese prefijo.

Swagger: http://localhost:8080/docs/; seleccionar el servidor `/api` en el selector de Swagger.

Para recargar o detener solo esta instancia de nginx:

```powershell
& $nginxExe -p $nginxPrefix -c nginx.conf -s reload
& $nginxExe -p $nginxPrefix -c nginx.conf -s quit
```

Si hay un error 502, revisar `npm run pm2:status`, `npm run pm2:logs` y `deploy/runtime/logs/error.log`. Si se cambia el puerto de PM2, cambiar también proxy_pass en la configuración y regenerarla.

nginx/Windows sirve para demostrar el TP; su documentación oficial indica limitaciones de rendimiento frente a Linux. Para un despliegue público estable, usar Linux y configurar dominio y HTTPS.

## nginx en Linux

Instalar nginx con el gestor de paquetes del servidor. Después de generar la configuración:

```bash
nginx -p "$(pwd)/deploy/runtime/" -c nginx.conf -t
nginx -p "$(pwd)/deploy/runtime/" -c nginx.conf
```

El puerto 8080 evita necesitar privilegios para abrir puertos menores a 1024. PM2 se inicia desde backend con los mismos scripts. Para persistencia tras reiniciar un servidor Linux, ejecutar `npx pm2 startup`, seguir el comando que muestra y luego `npx pm2 save`.

## Dependencias

No ejecutar `npm audit fix --force` automáticamente. El backend de ejecución y las herramientas de desarrollo se auditan por separado con `npm audit --omit=dev` y `npm audit`. Las herramientas como PM2 o Compodoc pueden tener alertas transitivas aunque no formen parte de la API expuesta; revisar el reporte y las versiones antes de un despliegue público.
