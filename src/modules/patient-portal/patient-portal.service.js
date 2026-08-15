const bcrypt = require('bcryptjs');
const repository = require('./patient-portal.repository');
const { normalizeText, normalizePhone } = require('../patients/patient.service');
const { recordAudit } = require('../../services/audit.service');
const { AppError } = require('../../utils/errors');

const registrationData = (body, passwordHash) => ({
  fullName: String(body.fullName || '').trim(),
  normalizedName: normalizeText(body.fullName),
  dateOfBirth: body.dateOfBirth || null,
  phone: String(body.phone || '').trim(),
  normalizedPhone: normalizePhone(body.phone),
  email: String(body.email || '').trim().toLowerCase(),
  passwordHash,
  alternatePhone: body.alternatePhone || null,
  preferredContactChannel: body.preferredContactChannel || null,
  address: body.address || null,
  emergencyContactName: body.emergencyContactName || null,
  emergencyContactPhone: body.emergencyContactPhone || null,
  patientCode: String(body.patientCode || '').trim().toUpperCase() || null
});

const register = async (body, req) => {
  const passwordHash = await bcrypt.hash(body.password, 12);
  try {
    const result = await repository.register(registrationData(body, passwordHash));
    await recordAudit({ req, action: 'patient_self_register', entity: 'patient', entityId: result.patient.Id, newValue: { patientId: result.patient.Id, userId: result.user.Id } });
    return { patientId: result.patient.Id, patientCode: result.patient.PatientCode, email: result.user.Email, linkedExistingPatient: result.linkedExistingPatient };
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) throw new AppError('This email or patient account is already registered.', 409, 'REGISTRATION_EXISTS');
    throw error;
  }
};

const getSummary = async (req) => {
  if (!req.user?.patientId) throw new AppError('This account is not linked to a patient record.', 403, 'PATIENT_ACCOUNT_UNLINKED');
  const result = await repository.summary(req.user.patientId);
  if (!result.patient) throw new AppError('The patient record is not available.', 404, 'PATIENT_NOT_FOUND');
  return result;
};

module.exports = { register, getSummary };
