const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AppError } = require('../utils/errors');
const { hasPermission, ROLES, PERMISSIONS } = require('../config/permissions');
const authRepository = require('../modules/auth/auth.repository');

const tokenFromRequest = (req) => {
  const cookieToken = req.cookies?.clinic_access;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const requireAuth = async (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (!token) return next(new AppError('يجب تسجيل الدخول أولًا.', 401, 'UNAUTHENTICATED'));
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (_) {
    return next(new AppError('جلسة الدخول غير صالحة أو منتهية.', 401, 'INVALID_SESSION'));
  }
  try {
    // Re-check the account on every protected request. This immediately blocks
    // disabled accounts and invalidates tokens after role/password/session edits.
    const current = await authRepository.findSessionState(decoded.id);
    const identityMatches = current
      && current.IsActive
      && Number(current.SessionVersion || 1) === Number(decoded.sessionVersion == null ? 1 : decoded.sessionVersion)
      && current.Role === decoded.role
      && Number(current.DoctorId || 0) === Number(decoded.doctorId || 0)
      && Number(current.PatientId || 0) === Number(decoded.patientId || 0);
    if (!identityMatches) return next(new AppError('جلسة الدخول غير صالحة أو تم تحديث صلاحيات الحساب.', 401, 'INVALID_SESSION'));
    req.user = decoded;
    return next();
  } catch (error) {
    return next(error);
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
  return next(new AppError('هذا الحساب لا يملك صلاحية إنشاء حجز بهذه الطريقة.', 403, 'FORBIDDEN'));
};

const isOwner = (req) => req.user?.role === ROLES.OWNER;

module.exports = { tokenFromRequest, requireAuth, requireRoles, requirePermission, requireAnyPermission, requireAppointmentCreate, isOwner };
