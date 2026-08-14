const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AppError } = require('../utils/errors');
const { hasPermission, ROLES, PERMISSIONS } = require('../config/permissions');

const tokenFromRequest = (req) => {
  const cookieToken = req.cookies?.clinic_access;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const requireAuth = (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (!token) return next(new AppError('يجب تسجيل الدخول أولًا.', 401, 'UNAUTHENTICATED'));
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    return next(new AppError('جلسة الدخول غير صالحة أو منتهية.', 401, 'INVALID_SESSION'));
  }
};

const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError('ليس لديك صلاحية لتنفيذ هذا الإجراء.', 403, 'FORBIDDEN'));
  return next();
};

const requirePermission = (permission) => (req, _res, next) => {
  if (!req.user || !hasPermission(req.user.role, permission)) return next(new AppError('ليس لديك صلاحية لتنفيذ هذا الإجراء.', 403, 'FORBIDDEN'));
  return next();
};

const requireAnyPermission = (...permissions) => (req, _res, next) => {
  if (!req.user || !permissions.some((permission) => hasPermission(req.user.role, permission))) return next(new AppError('ليس لديك صلاحية لتنفيذ هذا الإجراء.', 403, 'FORBIDDEN'));
  return next();
};

const requireAppointmentCreate = (req, _res, next) => {
  if (hasPermission(req.user?.role, PERMISSIONS.MANAGE_BOOKINGS)) return next();
  if (hasPermission(req.user?.role, PERMISSIONS.BOOK_SELF_APPOINTMENT) && req.user?.patientId) {
    req.body = { ...req.body, patientId: req.user.patientId, bookingSource: 'online', notes: null };
    return next();
  }
  return next(new AppError('Appointment booking is not allowed for this account.', 403, 'FORBIDDEN'));
};

const isOwner = (req) => req.user?.role === ROLES.OWNER;

module.exports = { tokenFromRequest, requireAuth, requireRoles, requirePermission, requireAnyPermission, requireAppointmentCreate, isOwner };
