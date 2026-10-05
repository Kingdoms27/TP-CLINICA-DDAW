const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'runtime');
fs.mkdirSync(path.join(output, 'logs'), {recursive: true});
const web = path.join(root, 'frontend', 'dist', 'frontend', 'browser').replaceAll('\\', '/');
const config = `worker_processes 1;
error_log logs/error.log;
pid logs/nginx.pid;
events { worker_connections 512; }
http {
  default_type application/octet-stream;
  types { text/html html; text/css css; application/javascript js mjs; application/json json; image/png png; image/jpeg jpg jpeg; image/svg+xml svg; image/x-icon ico; font/woff2 woff2; }
  access_log logs/access.log;
  sendfile on;
  server {
    listen 8080;
    server_name localhost;
    root "${web}";
    index index.html;
    location /api/ {
      proxy_pass http://127.0.0.1:3001/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /docs/ { proxy_pass http://127.0.0.1:3001/docs/; proxy_set_header Host $host; }
    location = /docs { return 302 /docs/; }
    location = /docs-json { proxy_pass http://127.0.0.1:3001/docs-json; }
    location / { try_files $uri $uri/ /index.html; }
  }
}
`;
fs.writeFileSync(path.join(output,'nginx.conf'), config);
console.log(`Configuración nginx: ${path.join(output,'nginx.conf')}`);
console.log('Frontend: http://localhost:8080 · API: /api/ · Swagger: /docs/');
