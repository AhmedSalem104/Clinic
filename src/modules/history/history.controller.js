const { ok, created } = require('../../utils/response');
const service = require('../medical-records/medical.service');
const { recordAudit } = require('../../services/audit.service');

const gyne = async (req, res) => {
  const patientId = Number(req.query.patientId);
  await service.withAccess(patientId, req.user, async () => {});
  return ok(res, await service.getGyneHistory(patientId));
};

const saveGyne = async (req, res) => {
  const patientId = Number(req.body.patientId);
  await service.withAccess(patientId, req.user, async () => {});
  const before = await service.getGyneHistory(patientId);
  const row = await service.upsertGyneHistory({ ...req.body, recordedBy: req.user.id });
  await recordAudit({ req, action: 'update', entity: 'gynecologic_history', entityId: row.Id, oldValue: before, newValue: row });
  return ok(res, row);
};

const obstetric = async (req, res) => {
  const patientId = Number(req.query.patientId);
  await service.withAccess(patientId, req.user, async () => {});
  return ok(res, await service.listObstetricHistory(patientId));
};

const createObstetric = async (req, res) => {
  const patientId = Number(req.body.patientId);
  await service.withAccess(patientId, req.user, async () => {});
  const row = await service.createObstetricHistory({ ...req.body, recordedBy: req.user.id });
  await recordAudit({ req, action: 'create', entity: 'obstetric_history', entityId: row.Id, newValue: row });
  return created(res, row);
};

module.exports = { gyne, saveGyne, obstetric, createObstetric };
