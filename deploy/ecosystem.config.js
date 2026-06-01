// PM2 Ecosystem Configuration for Frontend
module.exports = {
  apps: [{
    name: 'glassshop-frontend',
    script: 'serve',
    args: '-s build -l 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/glassshop/logs/frontend-error.log',
    out_file: '/opt/glassshop/logs/frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

