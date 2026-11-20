// PM2 process configuration for UE Cloudlearn Express API on Amazon EC2.
// Runtime secrets load from /var/www/ue-cloudlearn/.env via backend/src/config/env.js.
module.exports = {
  apps: [
    {
      name: 'ue-cloudlearn-api',
      script: 'src/server.js',
      cwd: '/var/www/ue-cloudlearn/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
