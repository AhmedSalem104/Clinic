const repository = require('./doctor.repository');
const { recordAudit } = require('../../services/audit.service');
const { AppError } = require('../../utils/errors');

const get = async (id) => {
  const doctor = await repository.getById(id);
  if (!doctor) throw new AppError('الطبيب غير موجود.', 404, 'DOCTOR_NOT_FOUND');
  return doctor;
};
const create = async (body, req) => { const doctor = await repository.create(body); await recordAudit({ req, action: 'create', entity: 'doctor', entityId: doctor.Id, newValue: doctor }); return doctor; };
const update = async (id, body, req) => { const doctor = await repository.update(id, body); if (!doctor) throw new AppError('الطبيب غير موجود.', 404, 'DOCTOR_NOT_FOUND'); await recordAudit({ req, action: 'update', entity: 'doctor', entityId: id, newValue: doctor }); return doctor; };
const setServices = async (id, serviceIds, req) => { const doctor = await get(id); const result = await repository.setServices(id, serviceIds); await recordAudit({ req, action: 'manage_services', entity: 'doctor', entityId: id, oldValue: doctor.services, newValue: result.services }); return result; };
const archive = async (id, req) => {
  const before = await get(id);
  const doctor = await repository.archive(id);
  if (!doctor) throw new AppError('الطبيب غير موجود.', 404, 'DOCTOR_NOT_FOUND');
  await recordAudit({ req, action: 'archive', entity: 'doctor', entityId: id, oldValue: before, newValue: doctor });
  return doctor;
};

module.exports = { ...repository, get, create, update, archive, setServices };
