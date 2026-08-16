const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { env } = require('./config/env');
const { logger } = require('./config/logger');
const { notFound, errorHandler } = require('./middleware/error-handler');
const { checkOrigin } = require('./middleware/origin-check');
const { apiRouter } = require('./routes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://cdn.socket.io'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'wss:'],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(cors({ origin: env.appOrigin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/api/health' },
  serializers: {
    req: (request) => ({ method: request.method, url: request.url, remoteAddress: request.ip }),
    res: (response) => ({ statusCode: response.statusCode }),
    err: (error) => ({ type: error.name, message: error.message, code: error.code, stack: env.nodeEnv === 'development' ? error.stack : undefined })
  }
}));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use('/api', checkOrigin);

app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', service: 'clinic' } }));
app.use('/api', apiRouter);
app.get(['/book', '/patient-booking'], (_req, res) => res.sendFile('patient-booking.html', { root: path.join(process.cwd(), 'public') }));
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: env.nodeEnv === 'production' ? '1h' : 0 }));
app.use(notFound);
app.use(errorHandler);

module.exports = { app };
