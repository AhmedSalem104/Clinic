const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();
// Appointment and queue calculations use the clinic's local wall-clock time.
// Override TZ in deployment when the clinic operates in another timezone.
process.env.TZ = process.env.TZ || 'Africa/Cairo';

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieSecure: toBoolean(process.env.COOKIE_SECURE, false),
  db: {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    encrypt: toBoolean(process.env.DB_ENCRYPT, true),
    trustServerCertificate: toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
    multipleActiveResultSets: toBoolean(process.env.DB_MULTIPLE_ACTIVE_RESULT_SETS, true),
    pool: {
      max: toNumber(process.env.DB_POOL_MAX, 10),
      min: toNumber(process.env.DB_POOL_MIN, 0),
      idleTimeoutMillis: toNumber(process.env.DB_POOL_IDLE_TIMEOUT, 30000)
    }
  },
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'storage/uploads'),
  maxUploadBytes: toNumber(process.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
  logLevel: process.env.LOG_LEVEL || 'info'
});

module.exports = { env };
