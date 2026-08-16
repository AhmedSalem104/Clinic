const path = require('node:path');
const { env } = require('../config/env');
const { AppError } = require('../utils/errors');

const assertDurableStorageAvailable = () => {
  if (env.fileStorageProvider === 'local' && !env.runningOnVercel) return;
  throw new AppError('رفع المستندات متوقف حتى يتم إعداد تخزين ملفات دائم وآمن للبيئة الحالية.', 503, 'DURABLE_STORAGE_NOT_CONFIGURED', {
    provider: env.fileStorageProvider,
    hint: 'Configure FILE_STORAGE_PROVIDER and its provider credentials before enabling medical document uploads.'
  });
};

const resolveLocalPath = (storagePath) => {
  const root = path.resolve(env.uploadDir);
  const target = path.resolve(String(storagePath || ''));
  const isInsideRoot = target === root || target.startsWith(`${root}${path.sep}`);
  if (!isInsideRoot) throw new AppError('مسار الملف غير صالح.', 400, 'INVALID_STORAGE_PATH');
  return target;
};

module.exports = { assertDurableStorageAvailable, resolveLocalPath };
