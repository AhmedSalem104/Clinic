const repository = require('./appointment.repository');
const queueService = require('../queue/queue.service');
const { recordAudit } = require('../../services/audit.service');
const { emitClinicEvent } = require('../../realtime/socket');
const { AppError } = require('../../utils/errors');
const { enqueueBookingConfirmed } = require('../../services/notification.service');
const { clinicDateKey } = require('../../utils/date');

const dateKey = (value) => clinicDateKey(value || Date.now());

const create = async (body, req) => {
  try {
    const appointment = await repository.create({ ...body, createdBy: req.user.id });
    if (appointment.DoctorId) await queueService.emitRecalculated(appointment.DoctorId, dateKey(appointment.StartAt));
    try { await enqueueBookingConfirmed(await repository.getById(appointment.Id)); } catch (_) { /* notification failure must not roll back a valid booking */ }
    await recordAudit({ req, action: 'create', entity: 'appointment', entityId: appointment.Id, newValue: appointment });
    emitClinicEvent('appointment:updated', { appointmentId: appointment.Id }, appointment.DoctorId);
    return appointment;
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      throw new AppError('This appointment is already reserved for the selected doctor.', 409, 'DOUBLE_BOOKING');
    }
    throw error;
  }
};

const reschedule = async (id, body, req) => {
  const before = await repository.getById(id);
  if (!before) throw new AppError('Appointment was not found.', 404, 'APPOINTMENT_NOT_FOUND');
  const appointment = await repository.reschedule(id, body.startAt);
  if (dateKey(before.StartAt) !== dateKey(appointment.StartAt)) await queueService.emitRecalculated(appointment.DoctorId, dateKey(before.StartAt));
  await queueService.emitRecalculated(appointment.DoctorId, dateKey(appointment.StartAt));
  await recordAudit({ req, action: 'reschedule', entity: 'appointment', entityId: id, oldValue: before, newValue: appointment });
  emitClinicEvent('appointment:updated', { appointmentId: id, startAt: appointment.StartAt }, appointment.DoctorId);
  return appointment;
};

const updateStatus = async (id, body, req) => {
  const appointment = await repository.updateStatus(id, body.status, body.reason);
  if (!appointment) throw new AppError('Appointment was not found.', 404, 'APPOINTMENT_NOT_FOUND');
  if (appointment.DoctorId) await queueService.emitRecalculated(appointment.DoctorId, dateKey(appointment.StartAt));
  await recordAudit({ req, action: 'status_change', entity: 'appointment', entityId: id, newValue: appointment });
  emitClinicEvent('appointment:updated', { appointmentId: id, status: appointment.Status }, appointment.DoctorId);
  return appointment;
};

module.exports = { ...repository, create, reschedule, updateStatus };
