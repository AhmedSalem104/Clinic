const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');

// Table names are selected only from this constant map. Values originating from
// a request are always bound parameters; they never become SQL identifiers.
const RELATIONS = Object.freeze({
  case: { table: 'MedicalCases', label: 'حالة طبية', code: 'CASE_PATIENT_MISMATCH' },
  visit: { table: 'Visits', label: 'زيارة طبية', code: 'VISIT_PATIENT_MISMATCH' },
  pregnancy: { table: 'Pregnancies', label: 'سجل الحمل', code: 'PREGNANCY_PATIENT_MISMATCH' },
  appointment: { table: 'Appointments', label: 'موعد', code: 'APPOINTMENT_PATIENT_MISMATCH' }
});

const relationValue = (value) => (value === undefined || value === null || value === '' ? null : Number(value));

const ensurePatientExists = async (transaction, patientId) => {
  const result = await transaction.request()
    .input('patientId', sql.Int, patientId)
    .query('SELECT TOP 1 Id FROM Patients WHERE Id=@patientId AND Status=N\'active\'');
  if (!result.recordset[0]) throw new AppError('المريضة غير موجودة أو غير نشطة.', 400, 'PATIENT_NOT_FOUND');
};

const ensureRelationBelongsToPatient = async (transaction, kind, relationId, patientId) => {
  const id = relationValue(relationId);
  if (!id) return;
  const relation = RELATIONS[kind];
  if (!relation) throw new AppError('نوع الرابط الطبي غير مدعوم.', 500, 'INVALID_MEDICAL_RELATION');
  const result = await transaction.request()
    .input('relationId', sql.Int, id)
    .input('patientId', sql.Int, patientId)
    .query(`SELECT TOP 1 Id FROM ${relation.table} WHERE Id=@relationId AND PatientId=@patientId`);
  if (!result.recordset[0]) {
    throw new AppError(`ال${relation.label} المحدد لا يخص هذه المريضة.`, 400, relation.code, { relation: kind, relationId: id, patientId });
  }
};

const ensureAppointmentDoctor = async (transaction, appointmentId, doctorId) => {
  const id = relationValue(appointmentId);
  const doctor = relationValue(doctorId);
  if (!id || !doctor) return;
  const result = await transaction.request()
    .input('appointmentId', sql.Int, id)
    .input('doctorId', sql.Int, doctor)
    .query('SELECT TOP 1 Id FROM Appointments WHERE Id=@appointmentId AND DoctorId=@doctorId');
  if (!result.recordset[0]) throw new AppError('الطبيب المحدد لا يطابق طبيب الموعد.', 400, 'APPOINTMENT_DOCTOR_MISMATCH');
};

const ensurePregnancyCase = async (transaction, pregnancyId, caseId) => {
  const pregnancy = relationValue(pregnancyId);
  const medicalCase = relationValue(caseId);
  if (!pregnancy || !medicalCase) return;
  const result = await transaction.request()
    .input('pregnancyId', sql.Int, pregnancy)
    .input('caseId', sql.Int, medicalCase)
    .query('SELECT TOP 1 Id FROM Pregnancies WHERE Id=@pregnancyId AND CaseId=@caseId');
  if (!result.recordset[0]) throw new AppError('سجل الحمل لا يرتبط بالحالة الطبية المحددة.', 400, 'PREGNANCY_CASE_MISMATCH');
};

const ensureMedicalLinks = async (transaction, data) => {
  await ensurePatientExists(transaction, data.patientId);
  await ensureRelationBelongsToPatient(transaction, 'appointment', data.appointmentId, data.patientId);
  await ensureRelationBelongsToPatient(transaction, 'case', data.caseId, data.patientId);
  await ensureRelationBelongsToPatient(transaction, 'visit', data.visitId, data.patientId);
  await ensureRelationBelongsToPatient(transaction, 'pregnancy', data.pregnancyId, data.patientId);
  await ensureAppointmentDoctor(transaction, data.appointmentId, data.doctorId);
  await ensurePregnancyCase(transaction, data.pregnancyId, data.caseId);
};

module.exports = {
  RELATIONS,
  ensurePatientExists,
  ensureRelationBelongsToPatient,
  ensureMedicalLinks
};
