const { env } = require('../config/env');
const { AppError } = require('../utils/errors');

const checkOrigin = (req, _res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== env.appOrigin) return next(new AppError('مصدر الطلب غير مسموح.', 403, 'ORIGIN_NOT_ALLOWED'));
  return next();
};

module.exports = { checkOrigin };
