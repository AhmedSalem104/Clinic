const repository = require('./queue.repository');
const { recordAudit } = require('../../services/audit.service');
const { emitClinicEvent } = require('../../realtime/socket');
const { AppError } = require('../../utils/errors');
const { clinicDateKey } = require('../../utils/date');

const queueDate = (value) => clinicDateKey(value || Date.now());

const emitRecalculated = async (doctorId, date) => {
  const entries = await repository.recalculateForDoctor(doctorId, date);
  emitClinicEvent('queue:recalculated', { doctorId, date, entries }, doctorId);
  return entries;
};

const setStatus = async (id, status, req) => {
  const entry = await repository.setStatus(id, status);
  if (!entry) throw new AppError('Queue entry was not found.', 404, 'QUEUE_ENTRY_NOT_FOUND');
  const entries = await emitRecalculated(entry.DoctorId, queueDate(entry.QueueDate || entry.CreatedAt));
  await recordAudit({ req, action: 'queue_status_change', entity: 'queue_entry', entityId: id, newValue: { ...entry, recalculatedCount: entries.length } });
  emitClinicEvent('queue:updated', { queueEntryId: id, status: entry.Status }, entry.DoctorId);
  return entry;
};

const reorder = async (id, position, req) => {
  const entry = await repository.reorder(id, position);
  if (!entry) throw new AppError('Queue entry was not found.', 404, 'QUEUE_ENTRY_NOT_FOUND');
  const entries = await emitRecalculated(entry.DoctorId, queueDate(entry.QueueDate || entry.CreatedAt));
  await recordAudit({ req, action: 'queue_reorder', entity: 'queue_entry', entityId: id, newValue: { ...entry, recalculatedCount: entries.length } });
  emitClinicEvent('queue:updated', { queueEntryId: id, position: entry.Position }, entry.DoctorId);
  return entry;
};

const pause = async (body, req) => {
  const pauseEntry = await repository.pause({ ...body, createdBy: req.user.id });
  const entries = await emitRecalculated(pauseEntry.DoctorId, queueDate(pauseEntry.StartedAt));
  await recordAudit({ req, action: 'doctor_pause', entity: 'doctor_pause', entityId: pauseEntry.Id, newValue: { ...pauseEntry, recalculatedCount: entries.length } });
  emitClinicEvent('doctor:paused', { doctorId: pauseEntry.DoctorId, pause: pauseEntry }, pauseEntry.DoctorId);
  return pauseEntry;
};

const resume = async (id, req) => {
  const pauseEntry = await repository.resume(id);
  if (!pauseEntry) throw new AppError('Pause was not found or has already been resumed.', 404, 'PAUSE_NOT_FOUND');
  const entries = await emitRecalculated(pauseEntry.DoctorId, queueDate(pauseEntry.StartedAt));
  await recordAudit({ req, action: 'doctor_resume', entity: 'doctor_pause', entityId: id, newValue: { ...pauseEntry, recalculatedCount: entries.length } });
  emitClinicEvent('doctor:resumed', { doctorId: pauseEntry.DoctorId, pause: pauseEntry }, pauseEntry.DoctorId);
  return pauseEntry;
};

module.exports = { ...repository, setStatus, reorder, pause, resume, emitRecalculated };
