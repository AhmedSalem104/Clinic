const { withTransaction } = require('../../db/repository');
const appointmentRepository = require('../appointments/appointment.repository');
const bookingRepository = require('./public-booking.repository');
const { normalizeText, normalizePhone } = require('../patients/patient.service');
const { recordAudit } = require('../../services/audit.service');
const { enqueueBookingConfirmed } = require('../../services/notification.service');
const queueService = require('../queue/queue.service');
const { emitClinicEvent } = require('../../realtime/socket');
const { clinicDateKey } = require('../../utils/date');
const { AppError } = require('../../utils/errors');
const { resolveBookingLocation } = require('../../services/location.service');

const dateKey = (value) => clinicDateKey(value || Date.now());
const OPTIONS_CACHE_TTL_MS = 15 * 1000;
const optionsCache = new Map();

const listOptions = async (doctorId = null) => {
  const key = doctorId ? String(doctorId) : 'all';
  const cached = optionsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await bookingRepository.listOptions(doctorId);
  optionsCache.set(key, { value, expiresAt: Date.now() + OPTIONS_CACHE_TTL_MS });
  return value;
};

const publicSlots = async ({ doctorId, serviceId, date }) => {
  if (date < clinicDateKey()) throw new AppError('اختاري تاريخًا اليوم أو بعده.', 400, 'DATE_IN_PAST');
  const result = await appointmentRepository.availableSlots({ doctorId, serviceId, date });
  return {
    service: result.service ? {
      BaseDurationMinutes: result.service.BaseDurationMinutes,
      Price: result.service.Price
    } : null,
    schedules: (result.schedules || []).map((item) => ({ DayOfWeek: item.DayOfWeek, StartTime: item.StartTime, EndTime: item.EndTime, BreaksJson: item.BreaksJson })),
    exceptions: (result.exceptions || []).map((item) => ({ ExceptionDate: item.ExceptionDate, StartTime: item.StartTime, EndTime: item.EndTime, ExceptionType: item.ExceptionType })),
    pauses: (result.pauses || []).map((item) => ({ StartedAt: item.StartedAt, EndAt: item.EndAt })),
    booked: (result.booked || []).map((item) => ({ StartAt: item.StartAt, ExpectedDurationMinutes: item.ExpectedDurationMinutes }))
  };
};

const createBooking = async (body, req) => {
  const normalizedPhone = normalizePhone(body.phone);
  if (normalizedPhone.length < 5) throw new AppError('أدخلي رقم هاتف صحيحًا.', 400, 'INVALID_PHONE');
  if (new Date(body.startAt).getTime() <= Date.now()) throw new AppError('اختاري موعدًا مستقبليًا.', 409, 'BOOKING_IN_PAST');
  const location = await resolveBookingLocation(body);

  let confirmation;
  try {
    confirmation = await withTransaction(async (transaction) => {
      let patient = await bookingRepository.findPatientByPhoneInTransaction(transaction, normalizedPhone);
      if (!patient) {
        patient = await bookingRepository.createGuestPatientInTransaction(transaction, {
          patientCode: bookingRepository.patientCode(),
          fullName: body.fullName,
          normalizedName: normalizeText(body.fullName),
          dateOfBirth: body.dateOfBirth || null,
          phone: String(body.phone).trim(),
          normalizedPhone,
          preferredContactChannel: body.preferredContactChannel || null,
          ...(location || {})
        });
      } else if (location) await bookingRepository.updatePatientLocationInTransaction(transaction, patient.Id, location);
      const appointment = await appointmentRepository.createInTransaction(transaction, {
        patientId: patient.Id,
        doctorId: body.doctorId,
        serviceId: body.serviceId,
        bookingSource: 'online',
        startAt: body.startAt,
        notes: null,
        createdBy: null
      });
      const result = await bookingRepository.confirmationInTransaction(transaction, appointment.Id);
      return { ...result, location, primaryAssignmentCreated: Boolean(appointment.PrimaryAssignmentCreated) };
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      throw new AppError('الموعد لم يعد متاحًا. اختاري وقتًا آخر.', 409, 'DOUBLE_BOOKING');
    }
    throw error;
  }

  if (!confirmation) throw new AppError('تعذر تأكيد الحجز.', 500, 'BOOKING_CONFIRMATION_FAILED');
  const appointment = await appointmentRepository.getById(confirmation.AppointmentId);
  try { await enqueueBookingConfirmed(appointment); } catch (_) { /* notification failure must not cancel the booking */ }
  await recordAudit({ req, action: 'public_booking', entity: 'appointment', entityId: confirmation.AppointmentId, newValue: {
    appointmentId: confirmation.AppointmentId,
    patientId: confirmation.PatientId,
    doctorId: confirmation.DoctorId,
    serviceId: confirmation.ServiceId,
    locationCaptured: Boolean(confirmation.location),
    addressSource: confirmation.location?.addressSource || null,
    primaryAssignmentCreated: Boolean(confirmation.primaryAssignmentCreated)
  } });
  if (confirmation.DoctorId) {
    await queueService.emitRecalculated(confirmation.DoctorId, dateKey(confirmation.StartAt));
    emitClinicEvent('appointment:updated', { appointmentId: confirmation.AppointmentId }, confirmation.DoctorId);
  }

  return {
    appointmentId: confirmation.AppointmentId,
    patientCode: confirmation.PatientCode,
    doctorName: confirmation.DoctorName,
    serviceName: confirmation.ServiceName,
    startAt: confirmation.StartAt,
    endAt: confirmation.EndAt,
    expectedDurationMinutes: confirmation.ExpectedDurationMinutes,
    price: confirmation.Price,
    address: confirmation.PatientAddress || location?.address || null,
    status: confirmation.Status,
    queueNumber: confirmation.QueueNumber || null,
    queuePosition: confirmation.Position || null,
    publicTrackingToken: confirmation.PublicTrackingToken,
    requiresQueue: Boolean(confirmation.RequiresQueue)
  };
};

module.exports = { listOptions, publicSlots, createBooking };
