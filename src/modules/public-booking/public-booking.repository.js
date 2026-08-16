const crypto = require('node:crypto');
const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');

const listOptions = async (doctorId = null) => {
  const result = await query(`
    SELECT d.Id,d.FullName,d.Specialty,
      (SELECT COUNT(1) FROM DoctorSchedules sch WHERE sch.DoctorId=d.Id AND sch.IsActive=1) ActiveScheduleCount,
      (SELECT COUNT(1)
       FROM DoctorServices ds
       JOIN Services bookableService ON bookableService.Id=ds.ServiceId
       WHERE ds.DoctorId=d.Id AND ds.IsActive=1 AND bookableService.IsActive=1 AND bookableService.RequiresBooking=1) BookableServiceCount,
      CAST(CASE WHEN EXISTS (SELECT 1 FROM DoctorSchedules sch WHERE sch.DoctorId=d.Id AND sch.IsActive=1)
        AND EXISTS (
          SELECT 1
          FROM DoctorServices ds
          JOIN Services bookableService ON bookableService.Id=ds.ServiceId
          WHERE ds.DoctorId=d.Id AND ds.IsActive=1 AND bookableService.IsActive=1 AND bookableService.RequiresBooking=1
        ) THEN 1 ELSE 0 END AS bit) CanBook
    FROM Doctors d
    WHERE d.Status=N'active'
    ORDER BY CanBook DESC, FullName;
    SELECT Id,Name,Category,BaseDurationMinutes,RequiresQueue
    FROM Services s
    WHERE s.IsActive=1 AND s.RequiresBooking=1
      AND EXISTS (
        SELECT 1
        FROM DoctorServices ds
        JOIN Doctors d ON d.Id=ds.DoctorId AND d.Status=N'active'
        WHERE ds.ServiceId=s.Id AND ds.IsActive=1
          AND EXISTS (SELECT 1 FROM DoctorSchedules sch WHERE sch.DoctorId=ds.DoctorId AND sch.IsActive=1)
          AND (@doctorId IS NULL OR ds.DoctorId=@doctorId)
      )
    ORDER BY Name;
  `, (request) => request.input('doctorId', sql.Int, doctorId || null));
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
    .input('address', sql.NVarChar(500), data.address || null)
    .input('addressSource', sql.NVarChar(30), data.addressSource || null)
    .input('locationLatitude', sql.Decimal(9, 6), data.latitude ?? null)
    .input('locationLongitude', sql.Decimal(9, 6), data.longitude ?? null)
    .input('locationAccuracyMeters', sql.Decimal(10, 2), data.accuracy ?? null)
    .input('locationCapturedAt', sql.DateTime2, data.capturedAt || null)
    .input('locationDetailsJson', sql.NVarChar(sql.MAX), data.detailsJson || null)
    .query(`
      INSERT INTO Patients (
        PatientCode,FullName,NormalizedName,DateOfBirth,Phone,NormalizedPhone,
        PreferredContactChannel,Address,AddressSource,LocationLatitude,LocationLongitude,
        LocationAccuracyMeters,LocationCapturedAt,LocationDetailsJson,RegistrationSource,ProfileStatus
      )
      OUTPUT INSERTED.Id,INSERTED.PatientCode,INSERTED.FullName,INSERTED.Phone,INSERTED.Address,INSERTED.AddressSource,
        INSERTED.LocationLatitude,INSERTED.LocationLongitude,INSERTED.LocationAccuracyMeters,INSERTED.LocationCapturedAt
      VALUES (
        @patientCode,@fullName,@normalizedName,@dateOfBirth,@phone,@normalizedPhone,
        @preferredContactChannel,@address,@addressSource,@locationLatitude,@locationLongitude,
        @locationAccuracyMeters,@locationCapturedAt,@locationDetailsJson,N'public_booking',N'incomplete'
      );
    `);
  return result.recordset[0];
};

const updatePatientLocationInTransaction = async (transaction, patientId, data) => {
  if (!data) return null;
  const result = await transaction.request()
    .input('id', sql.Int, patientId)
    .input('address', sql.NVarChar(500), data.address || null)
    .input('addressSource', sql.NVarChar(30), data.addressSource || null)
    .input('locationLatitude', sql.Decimal(9, 6), data.latitude ?? null)
    .input('locationLongitude', sql.Decimal(9, 6), data.longitude ?? null)
    .input('locationAccuracyMeters', sql.Decimal(10, 2), data.accuracy ?? null)
    .input('locationCapturedAt', sql.DateTime2, data.capturedAt || null)
    .input('locationDetailsJson', sql.NVarChar(sql.MAX), data.detailsJson || null)
    .query(`
      UPDATE Patients SET
        Address=COALESCE(NULLIF(@address,N''),Address),
        AddressSource=COALESCE(@addressSource,AddressSource),
        LocationLatitude=COALESCE(@locationLatitude,LocationLatitude),
        LocationLongitude=COALESCE(@locationLongitude,LocationLongitude),
        LocationAccuracyMeters=COALESCE(@locationAccuracyMeters,LocationAccuracyMeters),
        LocationCapturedAt=COALESCE(@locationCapturedAt,LocationCapturedAt),
        LocationDetailsJson=COALESCE(@locationDetailsJson,LocationDetailsJson),
        UpdatedAt=SYSUTCDATETIME()
      OUTPUT INSERTED.Id,INSERTED.Address,INSERTED.AddressSource,INSERTED.LocationLatitude,INSERTED.LocationLongitude,
        INSERTED.LocationAccuracyMeters,INSERTED.LocationCapturedAt
      WHERE Id=@id;
    `);
  return result.recordset[0] || null;
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

module.exports = {
  listOptions,
  findPatientByPhoneInTransaction,
  createGuestPatientInTransaction,
  updatePatientLocationInTransaction,
  confirmationInTransaction,
  patientCode
};
