const { ok, created } = require('../../utils/response');
const repo = require('./schedule.repository');
const { recordAudit } = require('../../services/audit.service');
const { AppError } = require('../../utils/errors');

const list = async (req, res) => ok(res, await repo.list(req.query.doctorId ? Number(req.query.doctorId) : null));
const create = async (req, res) => {
  const row = await repo.create(req.body);
  await recordAudit({ req, action: 'create', entity: 'doctor_schedule', entityId: row.Id, newValue: row });
  return created(res, row);
};
const update = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getById(id);
  if (!before) throw new AppError('جدول الطبيب غير موجود.', 404, 'SCHEDULE_NOT_FOUND');
  const row = await repo.update(id, req.body);
  await recordAudit({ req, action: 'update', entity: 'doctor_schedule', entityId: id, oldValue: before, newValue: row });
  return ok(res, row);
};
const status = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getById(id);
  if (!before) throw new AppError('جدول الطبيب غير موجود.', 404, 'SCHEDULE_NOT_FOUND');
  const row = await repo.updateStatus(id, req.body.isActive);
  await recordAudit({ req, action: 'status_change', entity: 'doctor_schedule', entityId: id, oldValue: before, newValue: row });
  return ok(res, row);
};
const remove = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getById(id);
  if (!before) throw new AppError('جدول الطبيب غير موجود.', 404, 'SCHEDULE_NOT_FOUND');
  const row = await repo.remove(id);
  if (!row) throw new AppError('جدول الطبيب غير موجود.', 404, 'SCHEDULE_NOT_FOUND');
  await recordAudit({ req, action: 'delete', entity: 'doctor_schedule', entityId: id, oldValue: before });
  return ok(res, { id, deleted: true });
};
const addException = async (req, res) => {
  const row = await repo.addException(req.body);
  await recordAudit({ req, action: 'create', entity: 'schedule_exception', entityId: row.Id, newValue: row });
  return created(res, row);
};
const updateException = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getExceptionById(id);
  if (!before) throw new AppError('استثناء الجدول غير موجود.', 404, 'EXCEPTION_NOT_FOUND');
  const row = await repo.updateException(id, req.body);
  await recordAudit({ req, action: 'update', entity: 'schedule_exception', entityId: id, oldValue: before, newValue: row });
  return ok(res, row);
};
const removeException = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getExceptionById(id);
  if (!before) throw new AppError('استثناء الجدول غير موجود.', 404, 'EXCEPTION_NOT_FOUND');
  await repo.removeException(id);
  await recordAudit({ req, action: 'delete', entity: 'schedule_exception', entityId: id, oldValue: before });
  return ok(res, { id, deleted: true });
};

module.exports = { list, create, update, status, remove, addException, updateException, removeException };
