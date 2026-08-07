module.exports = {
  apps: [{
    name: 'memorial-site',
    script: './server.js',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    pmx: false,
    max_memory_restart: '250M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      SITE_URL: 'https://miriamngo.com'
    }
  }]
};
