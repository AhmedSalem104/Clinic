const pino = require('pino');
const { env } = require('./env');

const logger = pino({
  level: env.logLevel,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'body.password'],
    censor: '[REDACTED]'
  },
  base: { service: 'clinic-management-system' }
});

module.exports = { logger };
