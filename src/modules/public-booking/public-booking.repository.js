const crypto = require('node:crypto');
const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');

const listOptions = async () => {
  const result = await query(`
    SELECT Id,FullName,Specialty
    FROM Doctors
    WHERE Status=N'active'
    ORDER BY FullName;
    SELECT Id,Name,Category,BaseDurationMinutes,RequiresQueue
    FROM Services
    WHERE IsActive=1 AND RequiresBooking=1
    ORDER BY Name;
  `);
  return { doctors: result.recordsets[0], services: result.recordsets[1] };
};

const findPatientByPhoneInTransaction = async (transaction, normalizedPhone) => {
  const result = await transaction.request()
    .input('normalizedPhone', sql.NVarChar(40), normalizedPhone)
    .query(`
      SELECT TOP 1 Id,PatientCode,FullName,Phone
      FROM Patients WITH (UPDLOCK,HOLDLOCK)
      WHERE NormalizedPhone=@normalizedPhone AND Status=N'active'
      ORDER BY CreatedAt ASC;
    `);
  return result.recordset[0] || null;
};

const createGuestPatientInTransaction = async (transaction, data) => {
  const result = await transaction.request()
    .input('patientCode', sql.NVarChar(30), data.patientCode)
    .input('fullName', sql.NVarChar(180), data.fullName)
    .input('normalizedName', sql.NVarChar(180), data.normalizedName)
    .input('dateOfBirth', sql.Date, data.dateOfBirth || null)
    .input('phone', sql.NVarChar(40), data.phone)
    .input('normalizedPhone', sql.NVarChar(40), data.normalizedPhone)
    .input('preferredContactChannel', sql.NVarChar(20), data.preferredContactChannel || null)
    .query(`
      INSERT INTO Patients (
        PatientCode,FullName,NormalizedName,DateOfBirth,Phone,NormalizedPhone,
        PreferredContactChannel,RegistrationSource,ProfileStatus
      )
      OUTPUT INSERTED.Id,INSERTED.PatientCode,INSERTED.FullName,INSERTED.Phone
      VALUES (
        @patientCode,@fullName,@normalizedName,@dateOfBirth,@phone,@normalizedPhone,
        @preferredContactChannel,N'public_booking',N'incomplete'
      );
    `);
  return result.recordset[0];
};

const confirmationInTransaction = async (transaction, appointmentId) => {
  const result = await transaction.request()
    .input('appointmentId', sql.Int, appointmentId)
    .query(`
      SELECT TOP 1
        a.Id AppointmentId,a.StartAt,a.EndAt,a.Price,a.Status,a.PublicTrackingToken,
        a.ExpectedDurationMinutes,a.BookingSource,
        p.Id PatientId,p.PatientCode,
        d.Id DoctorId,d.FullName DoctorName,
        s.Id ServiceId,s.Name ServiceName,s.RequiresQueue,
        q.QueueNumber,q.Position
      FROM Appointments a
      JOIN Patients p ON p.Id=a.PatientId
      JOIN Doctors d ON d.Id=a.DoctorId
      JOIN Services s ON s.Id=a.ServiceId
      LEFT JOIN QueueEntries q ON q.AppointmentId=a.Id
      WHERE a.Id=@appointmentId;
    `);
  return result.recordset[0] || null;
};

const patientCode = () => `P-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

module.exports = { listOptions, findPatientByPhoneInTransaction, createGuestPatientInTransaction, confirmationInTransaction, patientCode };
