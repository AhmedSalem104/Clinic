const { ok, created } = require('../../utils/response');
const { getPagination } = require('../../utils/pagination');
const repo = require('./pricing.repository');
const { recordAudit } = require('../../services/audit.service');
const { AppError } = require('../../utils/errors');

const list = async (req, res) => {
  const pagination = getPagination(req.query);
  const result = await repo.list({ ...pagination, doctorId: req.query.doctorId ? Number(req.query.doctorId) : null, serviceId: req.query.serviceId ? Number(req.query.serviceId) : null });
  return ok(res, result.rows, { page: pagination.page, pageSize: pagination.pageSize, total: result.total, totalPages: Math.ceil(result.total / pagination.pageSize) });
};

const create = async (req, res) => {
  const row = await repo.create(req.body, req.user.id);
  await recordAudit({ req, action: 'create', entity: 'pricing', entityId: row.Id, newValue: row });
  return created(res, row);
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getById(id);
  if (!before) throw new AppError('السعر غير موجود.', 404, 'PRICING_NOT_FOUND');
  const row = await repo.update(id, req.body);
  await recordAudit({ req, action: 'update', entity: 'pricing', entityId: id, oldValue: before, newValue: row });
  return ok(res, row);
};

const remove = async (req, res) => {
  const id = Number(req.params.id);
  const before = await repo.getById(id);
  if (!before) throw new AppError('السعر غير موجود.', 404, 'PRICING_NOT_FOUND');
  const row = await repo.archive(id);
  await recordAudit({ req, action: 'archive', entity: 'pricing', entityId: id, oldValue: before, newValue: row });
  return ok(res, { id, isActive: false });
};

module.exports = { list, create, update, remove };
