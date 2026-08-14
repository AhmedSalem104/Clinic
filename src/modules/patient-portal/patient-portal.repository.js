const crypto = require('node:crypto');
const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');

const patientCode = () => `P-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const register = async (data) => withTransaction(async (transaction) => {
  const emailResult = await transaction.request()
    .input('email', sql.NVarChar(255), data.email)
    .query('SELECT TOP 1 Id FROM Users WITH (UPDLOCK,HOLDLOCK) WHERE Email=@email');
  if (emailResult.recordset[0]) throw new AppError('This email is already registered.', 409, 'EMAIL_EXISTS');

  const duplicateResult = await transaction.request()
    .input('phone', sql.NVarChar(40), data.normalizedPhone)
    .input('normalizedName', sql.NVarChar(180), data.normalizedName)
    .input('dateOfBirth', sql.Date, data.dateOfBirth || null)
    .query(`
      SELECT TOP 1 Id FROM Patients WITH (UPDLOCK,HOLDLOCK)
      WHERE NormalizedPhone=@phone
         OR (@dateOfBirth IS NOT NULL AND NormalizedName=@normalizedName AND DateOfBirth=@dateOfBirth)
    `);
  if (duplicateResult.recordset[0]) {
    throw new AppError('A patient record with the same phone or identity already exists. Please contact the clinic to link your account.', 409, 'PATIENT_EXISTS');
  }

  const patientResult = await transaction.request()
    .input('patientCode', sql.NVarChar(30), patientCode())
    .input('fullName', sql.NVarChar(180), data.fullName)
    .input('normalizedName', sql.NVarChar(180), data.normalizedName)
    .input('dateOfBirth', sql.Date, data.dateOfBirth || null)
    .input('phone', sql.NVarChar(40), data.phone)
    .input('normalizedPhone', sql.NVarChar(40), data.normalizedPhone)
    .input('alternatePhone', sql.NVarChar(40), data.alternatePhone || null)
    .input('preferredContactChannel', sql.NVarChar(20), data.preferredContactChannel || null)
    .input('address', sql.NVarChar(500), data.address || null)
    .input('emergencyContactName', sql.NVarChar(160), data.emergencyContactName || null)
    .input('emergencyContactPhone', sql.NVarChar(40), data.emergencyContactPhone || null)
    .query(`
      INSERT INTO Patients (PatientCode,FullName,NormalizedName,DateOfBirth,Phone,NormalizedPhone,AlternatePhone,PreferredContactChannel,Address,EmergencyContactName,EmergencyContactPhone)
      OUTPUT INSERTED.Id,INSERTED.PatientCode,INSERTED.FullName
      VALUES (@patientCode,@fullName,@normalizedName,@dateOfBirth,@phone,@normalizedPhone,@alternatePhone,@preferredContactChannel,@address,@emergencyContactName,@emergencyContactPhone)
    `);
  const patient = patientResult.recordset[0];

  const userResult = await transaction.request()
    .input('fullName', sql.NVarChar(160), data.fullName)
    .input('email', sql.NVarChar(255), data.email)
    .input('passwordHash', sql.NVarChar(255), data.passwordHash)
    .input('patientId', sql.Int, patient.Id)
    .query(`
      INSERT INTO Users (FullName,Email,PasswordHash,Role,PatientId)
      OUTPUT INSERTED.Id,INSERTED.Email,INSERTED.Role,INSERTED.PatientId
      VALUES (@fullName,@email,@passwordHash,N'patient',@patientId)
    `);

  return { patient, user: userResult.recordset[0] };
});

const summary = async (patientId) => {
  const result = await query(`
    SELECT TOP 1 Id,PatientCode,FullName,DateOfBirth,Phone,PreferredContactChannel,Status,CreatedAt
    FROM Patients WHERE Id=@patientId AND Status=N'active';
    SELECT TOP 10 a.Id,a.StartAt,a.EndAt,a.ExpectedDurationMinutes,a.Price,a.Status,a.PublicTrackingToken,
      d.FullName DoctorName,s.Name ServiceName,q.QueueNumber,q.Status QueueStatus,q.ExpectedStartAt,q.ExpectedEndAt
    FROM Appointments a
    JOIN Doctors d ON d.Id=a.DoctorId
    JOIN Services s ON s.Id=a.ServiceId
    LEFT JOIN QueueEntries q ON q.AppointmentId=a.Id
    WHERE a.PatientId=@patientId
    ORDER BY CASE WHEN a.StartAt>=SYSUTCDATETIME() THEN 0 ELSE 1 END,a.StartAt DESC;
  `, (request) => request.input('patientId', sql.Int, patientId));
  return { patient: result.recordsets[0][0] || null, appointments: result.recordsets[1] };
};

module.exports = { register, summary };
