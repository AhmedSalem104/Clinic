const path = require('node:path');
const os = require('node:os');
const dotenv = require('dotenv');

dotenv.config();
// Appointment and queue calculations use the clinic's local wall-clock time.
// CLINIC_TIME_ZONE is used instead of relying on the host's timezone.
const clinicTimeZone = process.env.CLINIC_TIME_ZONE || process.env.TZ || 'Africa/Cairo';
process.env.TZ = clinicTimeZone;

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const runningOnVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const configuredUploadDir = process.env.UPLOAD_DIR || 'storage/uploads';
// Vercel functions can only write to /tmp. Configure durable object storage
// before enabling production document uploads.
const uploadDir = runningOnVercel
  ? path.join(os.tmpdir(), 'clinic-uploads')
  : path.resolve(process.cwd(), configuredUploadDir);

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  clinicTimeZone,
  runningOnVercel,
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
  uploadDir,
  maxUploadBytes: toNumber(process.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
  logLevel: process.env.LOG_LEVEL || 'info'
});

module.exports = { env };
