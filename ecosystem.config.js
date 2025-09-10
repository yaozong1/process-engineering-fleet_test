module.exports = {
  apps: [{
    name: 'fleet-manager',
    script: 'bun',
    args: 'run start',
    cwd: '/var/www/process-engineering-fleet',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    error_file: '/var/log/pm2/fleet-manager-error.log',
    out_file: '/var/log/pm2/fleet-manager-out.log',
    log_file: '/var/log/pm2/fleet-manager.log',
    time: true
  }]
}
