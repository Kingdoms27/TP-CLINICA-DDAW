const path = require('node:path');
module.exports = {
  apps: [{
    name: 'clinica-api',
    cwd: __dirname,
    script: path.join(__dirname, 'dist', 'main.js'),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    restart_delay: 2000,
    time: true,
    env_production: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: 3001,
      TZ: 'America/Argentina/Buenos_Aires',
      DB_SYNCHRONIZE: 'false',
    },
  }],
};
