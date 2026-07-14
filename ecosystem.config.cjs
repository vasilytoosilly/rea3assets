/**
 * PM2 Ecosystem Configuration for ReA3 Asset Manager
 *
 * Manages the rea3-assets Next.js production server.
 *
 * The rea3assets Next.js app uses `output: "standalone"` — after `npm run build`,
 * the self-contained production server lives at `.next/standalone/server.js`.
 * Copy the standalone output to a dedicated build directory (e.g. assets-build/)
 * before starting. See update-assets.sh in the ERP repo for the automated flow.
 *
 * Usage:
 *   # First-time setup (from the build directory):
 *   PORT=3003 pm2 start server.js --name rea3-assets --cwd /path/to/assets-build
 *
 *   # After setup, use PM2 directly:
 *   pm2 reload rea3-assets                      # zero-downtime restart
 *   pm2 logs rea3-assets                        # tail logs
 *
 *   # From this config file:
 *   pm2 start ecosystem.config.cjs              # start all processes
 *
 * The update-assets.sh script in the ERP repo expects this process to be
 * named "rea3-assets" so it can run `pm2 reload rea3-assets` after builds.
 *
 * IMPORTANT: On the production VPS, rea3-api-staging uses port 3001, so the
 * assets app runs on port 3003. Nginx routes assets.rea3.studio → :3003.
 * For local development, use `npm run dev` instead (defaults to port 3000).
 */

module.exports = {
  apps: [
    {
      name: "rea3-assets",
      // Standalone output — Next.js bundles everything into server.js.
      // When starting from the source repo, server.js lives inside .next/standalone/.
      // On the VPS, the standalone output is rsynced to a separate build directory
      // (e.g. /var/www/rea3erp/assets-build/) for zero-downtime deploys.
      script: ".next/standalone/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      env: {
        NODE_ENV: "production",
        PORT: 3003,
      },

      env_development: {
        NODE_ENV: "development",
        PORT: 3003,
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
