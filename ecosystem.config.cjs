/**
 * PM2 Ecosystem Configuration for ReA3 Asset Manager
 *
 * Manages the rea3-assets Next.js production server.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs                    # start
 *   pm2 start ecosystem.config.cjs --env production   # start (production)
 *   pm2 reload rea3-assets                            # zero-downtime restart
 *   pm2 logs rea3-assets                              # tail logs
 *
 * The update-assets.sh script in the ERP repo expects this process to be
 * named "rea3-assets" so it can run `pm2 reload rea3-assets` after builds.
 */

module.exports = {
  apps: [
    {
      name: "rea3-assets",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },

      env_development: {
        NODE_ENV: "development",
        PORT: 3001,
      },

      // Logging
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart strategy
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
