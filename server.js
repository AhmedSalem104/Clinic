const http = require('node:http');
const { app } = require('./src/app');
const { env } = require('./src/config/env');
const { attachRealtime } = require('./src/realtime/socket');
const { logger } = require('./src/config/logger');

const server = http.createServer(app);
attachRealtime(server);

if (require.main === module) {
  server.listen(env.port, () => {
    logger.info({ port: env.port, environment: env.nodeEnv }, 'Clinic server started');
  });
}

module.exports = { server };
