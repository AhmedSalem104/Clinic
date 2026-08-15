const bcrypt = require('bcryptjs');
const { ok, created } = require('../../utils/response');
const { getPagination } = require('../../utils/pagination');
const repo = require('../auth/auth.repository');
const { recordAudit } = require('../../services/audit.service');
const { AppError } = require('../../utils/errors');

const list = async (req, res) => {
  const pagination = getPagination(req.query);
  const result = await repo.list(pagination);
  return ok(res, result.rows, { page: pagination.page, pageSize: pagination.pageSize, total: result.total, totalPages: Math.ceil(result.total / pagination.pageSize) });
};

const duplicateError = (error) => {
  if (error.number === 2601 || error.number === 2627) return new AppError('البريد الإلكتروني مستخدم بالفعل.', 409, 'EMAIL_EXISTS');
  return error;
};

const create = async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  try {
    const row = await repo.createUser({ ...req.body, email: req.body.email.toLowerCase(), passwordHash });
    await recordAudit({ req, action: 'create', entity: 'user', entityId: row.Id, newValue: row });
    return created(res, row);
  } catch (error) {
    throw duplicateError(error);
  }
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getManageableById(id);
  if (!before) throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
  const passwordHash = req.body.password ? await bcrypt.hash(req.body.password, 12) : null;
  try {
    const row = await repo.updateUser(id, { ...req.body, email: req.body.email.toLowerCase(), passwordHash });
    await recordAudit({ req, action: 'update', entity: 'user', entityId: id, oldValue: before, newValue: row });
    return ok(res, row);
  } catch (error) {
    throw duplicateError(error);
  }
};

const status = async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id && !req.body.isActive) throw new AppError('لا يمكن تعطيل حسابك الحالي.', 400, 'SELF_DEACTIVATION_NOT_ALLOWED');
  const before = await repo.getManageableById(id);
  const changed = await repo.updateStatus(id, req.body.isActive);
  if (!changed || !before) throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
  await recordAudit({ req, action: 'status_change', entity: 'user', entityId: id, oldValue: before, newValue: { ...before, IsActive: req.body.isActive } });
  return ok(res, { id, isActive: req.body.isActive });
};

module.exports = { list, create, update, status };
