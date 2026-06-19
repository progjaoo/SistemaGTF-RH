module.exports = {
  apps: [
    {
      name: "sistema-rh-api",
      cwd: "/var/www/sistema-rh/backend",
      script: "dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
