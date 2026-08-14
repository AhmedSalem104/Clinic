const http = require('node:http');
const { app } = require('./src/app');
const { env } = require('./src/config/env');
const { attachRealtime } = require('./src/realtime/socket');
const { logger } = require('./src/config/logger');

const server = http.createServer(app);
// Vercel invokes the exported Express handler directly. Persistent Socket.IO
// connections require a long-lived Node process, so attach realtime only when
// the app is running on a regular server (local/VPS/Docker).
if (!env.runningOnVercel) {
  attachRealtime(server);
}

if (require.main === module) {
  server.listen(env.port, () => {
    logger.info({ port: env.port, environment: env.nodeEnv }, 'Clinic server started');
  });
}

// @vercel/node requires the entry module to export a handler or server.
// Exporting the Express app keeps the same REST API on serverless and local
// deployments while the HTTP server above remains responsible for local runs.
module.exports = app;
