const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');

const list = async ({ pageSize, offset, search }) => {
  const result = await query(`
    SELECT d.Id, d.FullName, d.Specialty, d.Phone, d.Email, d.Status, d.Bio,
      (SELECT COUNT(1) FROM PatientAssignments pa WHERE pa.DoctorId=d.Id AND pa.EndedAt IS NULL) AS AssignedPatients,
      (SELECT COUNT(1) FROM DoctorServices ds WHERE ds.DoctorId=d.Id AND ds.IsActive=1) AS ServiceCount
    FROM Doctors d WHERE (@search=N'' OR d.FullName LIKE N'%'+@search+N'%' OR d.Specialty LIKE N'%'+@search+N'%')
    ORDER BY d.FullName OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT_BIG(1) AS Total FROM Doctors d WHERE (@search=N'' OR d.FullName LIKE N'%'+@search+N'%' OR d.Specialty LIKE N'%'+@search+N'%');
  `, (request) => request.input('search', sql.NVarChar(160), search || '').input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize));
  return { rows: result.recordsets[0], total: Number(result.recordsets[1][0].Total) };
};

const getById = async (id) => {
  const result = await query(`SELECT Id, FullName, Specialty, Phone, Email, Status, Bio FROM Doctors WHERE Id=@id;
    SELECT s.Id, s.Name, s.Category, s.BaseDurationMinutes, ds.IsActive FROM DoctorServices ds JOIN Services s ON s.Id=ds.ServiceId WHERE ds.DoctorId=@id;
    SELECT Id, DayOfWeek, StartTime, EndTime, BreaksJson, IsActive FROM DoctorSchedules WHERE DoctorId=@id ORDER BY DayOfWeek, StartTime;`, (request) => request.input('id', sql.Int, id));
  const doctor = result.recordsets[0][0];
  return doctor ? { ...doctor, services: result.recordsets[1], schedules: result.recordsets[2] } : null;
};

const create = async (data) => {
  const result = await query(`INSERT INTO Doctors (FullName, Specialty, Phone, Email, Bio) OUTPUT INSERTED.* VALUES (@fullName,@specialty,@phone,@email,@bio)`, (request) => request.input('fullName', sql.NVarChar(160), data.fullName).input('specialty', sql.NVarChar(160), data.specialty || null).input('phone', sql.NVarChar(40), data.phone || null).input('email', sql.NVarChar(255), data.email || null).input('bio', sql.NVarChar(1000), data.bio || null));
  return result.recordset[0];
};

const update = async (id, data) => {
  const result = await query(`UPDATE Doctors SET FullName=@fullName, Specialty=@specialty, Phone=@phone, Email=@email, Bio=@bio, Status=@status, UpdatedAt=SYSUTCDATETIME()
    OUTPUT INSERTED.* WHERE Id=@id`, (request) => request.input('id', sql.Int, id).input('fullName', sql.NVarChar(160), data.fullName).input('specialty', sql.NVarChar(160), data.specialty || null).input('phone', sql.NVarChar(40), data.phone || null).input('email', sql.NVarChar(255), data.email || null).input('bio', sql.NVarChar(1000), data.bio || null).input('status', sql.NVarChar(30), data.status || 'active'));
  return result.recordset[0] || null;
};

const remove = async (id) => withTransaction(async (transaction) => {
  const dependencyResult = await transaction.request().input('id', sql.Int, id).query(`
    SELECT
      (SELECT COUNT_BIG(1) FROM Users WHERE DoctorId=@id) AS UsersCount,
      (SELECT COUNT_BIG(1) FROM PatientAssignments WHERE DoctorId=@id) AS AssignmentsCount,
      (SELECT COUNT_BIG(1) FROM MedicalCases WHERE AssignedDoctorId=@id) AS CasesCount,
      (SELECT COUNT_BIG(1) FROM Pregnancies WHERE AssignedDoctorId=@id) AS PregnanciesCount,
      (SELECT COUNT_BIG(1) FROM Appointments WHERE DoctorId=@id) AS AppointmentsCount,
      (SELECT COUNT_BIG(1) FROM QueueEntries WHERE DoctorId=@id) AS QueueEntriesCount,
      (SELECT COUNT_BIG(1) FROM DoctorPauses WHERE DoctorId=@id) AS PausesCount,
      (SELECT COUNT_BIG(1) FROM Visits WHERE DoctorId=@id) AS VisitsCount,
      (SELECT COUNT_BIG(1) FROM Medications WHERE PrescribedBy=@id) AS MedicationsCount,
      (SELECT COUNT_BIG(1) FROM LabTests WHERE RequestedBy=@id) AS LabsCount,
      (SELECT COUNT_BIG(1) FROM Ultrasounds WHERE PerformedBy=@id) AS UltrasoundsCount,
      (SELECT COUNT_BIG(1) FROM ProgressIndicators WHERE CreatedBy=@id) AS ProgressCount;
  `);
  const counts = dependencyResult.recordset[0] || {};
  const blockers = [
    ['حسابات المستخدمين', counts.UsersCount],
    ['تعيينات المرضى', counts.AssignmentsCount],
    ['الحالات الطبية', counts.CasesCount],
    ['سجلات الحمل', counts.PregnanciesCount],
    ['الحجوزات', counts.AppointmentsCount],
    ['عناصر الطابور', counts.QueueEntriesCount],
    ['توقفات الطبيب', counts.PausesCount],
    ['الزيارات الطبية', counts.VisitsCount],
    ['الأدوية الموصوفة', counts.MedicationsCount],
    ['التحاليل المطلوبة', counts.LabsCount],
    ['فحوصات السونار', counts.UltrasoundsCount],
    ['مؤشرات المتابعة', counts.ProgressCount]
  ].filter(([, count]) => Number(count) > 0);
  if (blockers.length) {
    throw new AppError(`لا يمكن حذف الطبيب نهائيًا لأنه مرتبط بـ ${blockers.map(([label, count]) => `${label} (${count})`).join('، ')}. افصل الارتباطات أولًا أو عطّل الطبيب.`, 409, 'DOCTOR_HAS_REFERENCES', { blockers });
  }

  const result = await transaction.request().input('id', sql.Int, id).query(`
    DELETE FROM DoctorServices WHERE DoctorId=@id;
    DELETE FROM Pricing WHERE DoctorId=@id;
    DELETE FROM DoctorSchedules WHERE DoctorId=@id;
    DELETE FROM ScheduleExceptions WHERE DoctorId=@id;
    DELETE FROM Doctors OUTPUT DELETED.* WHERE Id=@id;
  `);
  return result.recordsets[result.recordsets.length - 1]?.[0] || null;
});

const setServices = async (doctorId, serviceIds) => {
  await query('DELETE FROM DoctorServices WHERE DoctorId=@doctorId', (request) => request.input('doctorId', sql.Int, doctorId));
  for (const serviceId of serviceIds) await query('INSERT INTO DoctorServices (DoctorId, ServiceId) VALUES (@doctorId,@serviceId)', (request) => request.input('doctorId', sql.Int, doctorId).input('serviceId', sql.Int, serviceId));
  return getById(doctorId);
};

module.exports = { list, getById, create, update, remove, setServices };
