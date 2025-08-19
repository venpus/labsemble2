module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    cwd: '/var/www/labsemble',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'client/build'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    wait_ready: true,
    // Lightsail specific optimizations
    node_args: '--max-old-space-size=1024',
    max_memory_restart: '800M',
    // Better error handling for cloud environment
    autorestart: true,
    // Log file management
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/err.log'
  }]
}; 