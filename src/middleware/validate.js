const { AppError } = require('../utils/errors');

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(new AppError('تحقق من البيانات المدخلة.', 400, 'VALIDATION_ERROR', result.error.flatten()));
  }
  req[source] = result.data;
  return next();
};

module.exports = { validate };
