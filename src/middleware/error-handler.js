const { logger } = require('../config/logger');
const { AppError } = require('../utils/errors');

const notFound = (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'المورد المطلوب غير موجود.' } });
  }
  return res.sendFile('index.html', { root: require('node:path').join(process.cwd(), 'public') });
};

const errorHandler = (error, req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  if (statusCode >= 500) logger.error({ err: error, path: req.path, method: req.method }, 'Unhandled request error');
  else logger.warn({ err: error, path: req.path, method: req.method }, 'Request rejected');
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode >= 500 ? 'حدث خطأ غير متوقع. حاول مرة أخرى.' : error.message,
      ...(error.details ? { details: error.details } : {})
    }
  });
};

module.exports = { notFound, errorHandler };
