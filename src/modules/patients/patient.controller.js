const { ok, created } = require('../../utils/response');
const service = require('./patient.service');
const { getPagination, getSort } = require('../../utils/pagination');

const list = async (req, res) => {
  const { page, pageSize, offset } = getPagination(req.query);
  const sortColumn = getSort(req.query.sort, ['p.FullName', 'p.CreatedAt', 'p.PatientCode'], 'p.CreatedAt');
  const sortDirection = String(req.query.direction).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const result = await service.list({ user: req.user, search: req.query.search, page, pageSize, offset, sortColumn, sortDirection });
  return ok(res, result.rows, { page, pageSize, total: result.total, totalPages: Math.ceil(result.total / pageSize) });
};

const create = async (req, res) => created(res, await service.create(req.body, req));
const getById = async (req, res) => ok(res, await service.getById(Number(req.params.id), req.user));
const update = async (req, res) => ok(res, await service.update(Number(req.params.id), req.body, req));
const remove = async (req, res) => ok(res, await service.remove(Number(req.params.id), req));
const assign = async (req, res) => created(res, await service.assign({ ...req.body, patientId: Number(req.params.id) }, req));
const assignments = async (req, res) => ok(res, await service.getAssignments(Number(req.params.id), req.user));

module.exports = { list, create, getById, update, remove, assign, assignments };
