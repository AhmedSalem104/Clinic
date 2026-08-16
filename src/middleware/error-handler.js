const path = require('node:path');
const { logger } = require('../config/logger');
const { AppError } = require('../utils/errors');

const notFound = (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'المورد المطلوب غير موجود.' }
    });
  }
  return res.sendFile('index.html', { root: path.join(process.cwd(), 'public') });
};

const uploadError = (error) => {
  if (!(error?.name === 'MulterError' || String(error?.code || '').startsWith('LIMIT_'))) return null;
  if (error.code === 'LIMIT_FILE_SIZE') {
    return { statusCode: 413, code: 'FILE_TOO_LARGE', message: 'حجم الملف أكبر من الحد المسموح به.' };
  }
  return { statusCode: 400, code: 'INVALID_UPLOAD', message: 'تعذر رفع الملف. تأكد من نوع الملف ثم حاول مرة أخرى.' };
};

const errorHandler = (error, req, res, _next) => {
  const upload = uploadError(error);
  const statusCode = error instanceof AppError ? error.statusCode : upload?.statusCode || 500;
  const code = error instanceof AppError ? error.code : upload?.code || 'INTERNAL_ERROR';
  const message = error instanceof AppError ? error.message : upload?.message;

  if (statusCode >= 500) logger.error({ err: error, path: req.path, method: req.method }, 'Unhandled request error');
  else logger.warn({ err: error, path: req.path, method: req.method }, 'Request rejected');

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode >= 500 ? 'حدث خطأ غير متوقع. حاول مرة أخرى.' : message,
      ...(error.details ? { details: error.details } : {})
    }
  });
};

module.exports = { notFound, errorHandler };
