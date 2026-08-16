const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');

const canAccessPatient = async (patientId, user) => {
  if (user?.role === 'owner') return true;
  if (user?.role !== 'doctor' || !user.doctorId) return false;
  const result = await query(`SELECT TOP 1 1 AS Allowed
    FROM PatientAssignments
    WHERE PatientId=@patientId AND DoctorId=@doctorId AND EndedAt IS NULL
    UNION ALL
    SELECT TOP 1 1 AS Allowed
    FROM Appointments
    WHERE PatientId=@patientId AND DoctorId=@doctorId AND Status NOT IN (N'cancelled', N'no_show')`, (request) => request.input('patientId', sql.Int, patientId).input('doctorId', sql.Int, user.doctorId));
  return Boolean(result.recordset[0]);
};

const assertMedicalAccess = async (patientId, user) => {
  if (!(await canAccessPatient(patientId, user))) throw new AppError('لا يمكن الوصول إلى السجل الطبي لهذه المريضة.', 403, 'MEDICAL_ACCESS_DENIED');
};

module.exports = { canAccessPatient, assertMedicalAccess };
