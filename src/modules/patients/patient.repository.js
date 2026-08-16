const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');

const doctorScope = (user, alias = 'p') => user?.role === 'doctor' ? `AND (
  EXISTS (
    SELECT 1 FROM PatientAssignments pa_scope
    WHERE pa_scope.PatientId = ${alias}.Id AND pa_scope.DoctorId = @scopeDoctorId AND pa_scope.EndedAt IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM Appointments appointment_scope
    WHERE appointment_scope.PatientId = ${alias}.Id AND appointment_scope.DoctorId = @scopeDoctorId
      AND appointment_scope.Status NOT IN (N'cancelled', N'no_show')
  )
)` : '';

const list = async ({ user, search, pageSize, offset, sortColumn, sortDirection }) => {
  const scope = doctorScope(user);
  const result = await query(`
    SELECT p.Id, p.PatientCode, p.FullName, p.DateOfBirth, p.Phone, p.HighRiskFlag, p.Status, p.ProfileStatus, p.RegistrationSource,
      primaryDoctor.FullName AS AssignedDoctor,
      currentCase.Type AS CurrentCase,
      lastVisit.CreatedAt AS LastVisit,
      nextAppointment.StartAt AS NextAppointment
    FROM Patients p
    OUTER APPLY (SELECT TOP 1 d.FullName FROM PatientAssignments pa JOIN Doctors d ON d.Id = pa.DoctorId
      WHERE pa.PatientId = p.Id AND pa.AssignmentType = N'primary' AND pa.EndedAt IS NULL ORDER BY pa.AssignedAt DESC) primaryDoctor
    OUTER APPLY (SELECT TOP 1 mc.Type FROM MedicalCases mc WHERE mc.PatientId = p.Id AND mc.Status = N'active' ORDER BY mc.StartDate DESC) currentCase
    OUTER APPLY (SELECT TOP 1 v.CreatedAt FROM Visits v WHERE v.PatientId = p.Id AND v.Status = N'completed' ORDER BY v.CreatedAt DESC) lastVisit
    OUTER APPLY (SELECT TOP 1 a.StartAt FROM Appointments a WHERE a.PatientId = p.Id AND a.StartAt >= SYSUTCDATETIME()
      AND a.Status IN (N'booked', N'confirmed', N'arrived', N'waiting', N'late', N'in_consultation') ORDER BY a.StartAt) nextAppointment
    WHERE p.Status = N'active'
      AND (@search = N'' OR p.NormalizedName LIKE N'%' + @search + N'%' OR p.NormalizedPhone LIKE N'%' + @search + N'%' OR p.PatientCode LIKE N'%' + @search + N'%')
      ${scope}
    ORDER BY ${sortColumn} ${sortDirection}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT_BIG(1) AS Total FROM Patients p
    WHERE p.Status = N'active'
      AND (@search = N'' OR p.NormalizedName LIKE N'%' + @search + N'%' OR p.NormalizedPhone LIKE N'%' + @search + N'%' OR p.PatientCode LIKE N'%' + @search + N'%')
      ${scope};
  `, (request) => request.input('search', sql.NVarChar(180), search || '')
    .input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize)
    .input('scopeDoctorId', sql.Int, user?.doctorId || null));
  return { rows: result.recordsets[0], total: Number(result.recordsets[1][0].Total) };
};

const findPotentialDuplicates = async ({ phone, normalizedName, dateOfBirth }) => {
  const result = await query(`
    SELECT TOP 10 Id, PatientCode, FullName, DateOfBirth, Phone,
      CASE WHEN NormalizedPhone = @phone THEN N'phone' ELSE N'name_and_birth_date' END AS MatchReason
    FROM Patients
    WHERE NormalizedPhone = @phone OR (NormalizedName = @normalizedName AND DateOfBirth = @dateOfBirth)
    ORDER BY CreatedAt DESC
  `, (request) => request.input('phone', sql.NVarChar(40), phone)
    .input('normalizedName', sql.NVarChar(180), normalizedName)
    .input('dateOfBirth', sql.Date, dateOfBirth || null));
  return result.recordset;
};

const create = async (data) => {
  const result = await query(`
    INSERT INTO Patients (PatientCode, FullName, NormalizedName, DateOfBirth, Phone, NormalizedPhone, AlternatePhone, PreferredContactChannel, Address, AddressSource, LocationLatitude, LocationLongitude, LocationAccuracyMeters, LocationCapturedAt, EmergencyContactName, EmergencyContactPhone, RegistrationSource, ProfileStatus)
    OUTPUT INSERTED.Id, INSERTED.PatientCode, INSERTED.FullName, INSERTED.DateOfBirth, INSERTED.Phone, INSERTED.Address, INSERTED.AddressSource, INSERTED.LocationLatitude, INSERTED.LocationLongitude, INSERTED.LocationAccuracyMeters, INSERTED.LocationCapturedAt, INSERTED.Status, INSERTED.ProfileStatus, INSERTED.RegistrationSource, INSERTED.CreatedAt
    VALUES (@patientCode, @fullName, @normalizedName, @dateOfBirth, @phone, @normalizedPhone, @alternatePhone, @preferredContactChannel, @address, @addressSource, @locationLatitude, @locationLongitude, @locationAccuracyMeters, @locationCapturedAt, @emergencyContactName, @emergencyContactPhone, @registrationSource, @profileStatus)
  `, (request) => request.input('patientCode', sql.NVarChar(30), data.patientCode)
    .input('fullName', sql.NVarChar(180), data.fullName)
    .input('normalizedName', sql.NVarChar(180), data.normalizedName)
    .input('dateOfBirth', sql.Date, data.dateOfBirth || null)
    .input('phone', sql.NVarChar(40), data.phone)
    .input('normalizedPhone', sql.NVarChar(40), data.normalizedPhone)
    .input('alternatePhone', sql.NVarChar(40), data.alternatePhone || null)
    .input('preferredContactChannel', sql.NVarChar(20), data.preferredContactChannel || null)
    .input('address', sql.NVarChar(500), data.address || null)
    .input('addressSource', sql.NVarChar(30), data.addressSource || (data.address ? 'manual' : null))
    .input('locationLatitude', sql.Decimal(9, 6), data.locationLatitude ?? null)
    .input('locationLongitude', sql.Decimal(9, 6), data.locationLongitude ?? null)
    .input('locationAccuracyMeters', sql.Decimal(10, 2), data.locationAccuracyMeters ?? null)
    .input('locationCapturedAt', sql.DateTime2, data.locationCapturedAt || null)
    .input('emergencyContactName', sql.NVarChar(160), data.emergencyContactName || null)
    .input('emergencyContactPhone', sql.NVarChar(40), data.emergencyContactPhone || null)
    .input('registrationSource', sql.NVarChar(30), data.registrationSource || 'reception')
    .input('profileStatus', sql.NVarChar(20), data.profileStatus || 'complete'));
  return result.recordset[0];
};

const getById = async (id, user) => {
  const scope = doctorScope(user);
  const result = await query(`
    SELECT p.Id, p.PatientCode, p.FullName, p.DateOfBirth, p.Phone, p.AlternatePhone, p.PreferredContactChannel,
      p.Address, p.AddressSource, p.LocationLatitude, p.LocationLongitude, p.LocationAccuracyMeters, p.LocationCapturedAt, p.LocationDetailsJson,
      p.EmergencyContactName, p.EmergencyContactPhone, p.HighRiskFlag, p.Status, p.ProfileStatus, p.RegistrationSource, p.CreatedAt,
      primaryDoctor.Id AS AssignedDoctorId, primaryDoctor.FullName AS AssignedDoctor,
      activeCase.Id AS CurrentCaseId, activeCase.Type AS CurrentCase, activeCase.Status AS CurrentCaseStatus,
      latestVisit.Id AS LatestVisitId, latestVisit.CreatedAt AS LatestVisitDate, latestVisit.Diagnosis AS LatestDiagnosis,
      activePregnancy.Id AS ActivePregnancyId, activePregnancy.EDD, activePregnancy.LMP
    FROM Patients p
    OUTER APPLY (SELECT TOP 1 d.Id, d.FullName FROM PatientAssignments pa JOIN Doctors d ON d.Id = pa.DoctorId
      WHERE pa.PatientId = p.Id AND pa.AssignmentType = N'primary' AND pa.EndedAt IS NULL ORDER BY pa.AssignedAt DESC) primaryDoctor
    OUTER APPLY (SELECT TOP 1 mc.Id, mc.Type, mc.Status FROM MedicalCases mc WHERE mc.PatientId = p.Id AND mc.Status = N'active' ORDER BY mc.StartDate DESC) activeCase
    OUTER APPLY (SELECT TOP 1 v.Id, v.CreatedAt, v.Diagnosis FROM Visits v WHERE v.PatientId = p.Id AND v.Status = N'completed' ORDER BY v.CreatedAt DESC) latestVisit
    OUTER APPLY (SELECT TOP 1 pr.Id, pr.EDD, pr.LMP FROM Pregnancies pr WHERE pr.PatientId = p.Id AND pr.Status = N'active' ORDER BY pr.CreatedAt DESC) activePregnancy
    WHERE p.Id = @id ${scope};
    SELECT TOP 5 a.Id, a.StartAt, a.Status, s.Name AS ServiceName, d.FullName AS DoctorName
      FROM Appointments a JOIN Services s ON s.Id = a.ServiceId JOIN Doctors d ON d.Id = a.DoctorId
      WHERE a.PatientId = @id ORDER BY a.StartAt DESC;
    SELECT TOP 10 m.Id, m.DrugName, m.Dose, m.Route, m.Frequency, m.Status FROM Medications m WHERE m.PatientId = @id AND m.Status = N'active' ORDER BY m.StartDate DESC;
    SELECT TOP 10 al.Id, al.Substance, al.Reaction, al.Severity, al.Status FROM Allergies al WHERE al.PatientId = @id AND al.Status = N'active' ORDER BY al.RecordedAt DESC;
  `, (request) => request.input('id', sql.Int, id).input('scopeDoctorId', sql.Int, user?.doctorId || null));
  const patient = result.recordsets[0][0];
  if (!patient) return null;
  return { ...patient, appointments: result.recordsets[1], medications: result.recordsets[2], allergies: result.recordsets[3] };
};

const update = async (id, data) => {
  const before = await query('SELECT * FROM Patients WHERE Id = @id', (request) => request.input('id', sql.Int, id));
  if (!before.recordset[0]) return null;
  const result = await query(`
    UPDATE Patients SET FullName=@fullName, NormalizedName=@normalizedName, DateOfBirth=@dateOfBirth, Phone=@phone,
      NormalizedPhone=@normalizedPhone, AlternatePhone=@alternatePhone, PreferredContactChannel=@preferredContactChannel,
      Address=@address, AddressSource=COALESCE(@addressSource, AddressSource),
      LocationLatitude=COALESCE(@locationLatitude, LocationLatitude), LocationLongitude=COALESCE(@locationLongitude, LocationLongitude),
      LocationAccuracyMeters=COALESCE(@locationAccuracyMeters, LocationAccuracyMeters), LocationCapturedAt=COALESCE(@locationCapturedAt, LocationCapturedAt),
      EmergencyContactName=@emergencyContactName, EmergencyContactPhone=@emergencyContactPhone,
      ProfileStatus=COALESCE(@profileStatus, ProfileStatus), UpdatedAt=SYSUTCDATETIME()
    OUTPUT INSERTED.Id, INSERTED.PatientCode, INSERTED.FullName, INSERTED.DateOfBirth, INSERTED.Phone, INSERTED.Address, INSERTED.AddressSource, INSERTED.LocationLatitude, INSERTED.LocationLongitude, INSERTED.LocationAccuracyMeters, INSERTED.LocationCapturedAt, INSERTED.Status, INSERTED.ProfileStatus, INSERTED.RegistrationSource
    WHERE Id=@id
  `, (request) => request.input('id', sql.Int, id).input('fullName', sql.NVarChar(180), data.fullName)
    .input('normalizedName', sql.NVarChar(180), data.normalizedName).input('dateOfBirth', sql.Date, data.dateOfBirth || null)
    .input('phone', sql.NVarChar(40), data.phone).input('normalizedPhone', sql.NVarChar(40), data.normalizedPhone)
    .input('alternatePhone', sql.NVarChar(40), data.alternatePhone || null).input('preferredContactChannel', sql.NVarChar(20), data.preferredContactChannel || null)
    .input('address', sql.NVarChar(500), data.address || null).input('addressSource', sql.NVarChar(30), data.addressSource || (data.address ? 'manual' : null))
    .input('locationLatitude', sql.Decimal(9, 6), data.locationLatitude ?? null).input('locationLongitude', sql.Decimal(9, 6), data.locationLongitude ?? null)
    .input('locationAccuracyMeters', sql.Decimal(10, 2), data.locationAccuracyMeters ?? null).input('locationCapturedAt', sql.DateTime2, data.locationCapturedAt || null)
    .input('emergencyContactName', sql.NVarChar(160), data.emergencyContactName || null)
    .input('emergencyContactPhone', sql.NVarChar(40), data.emergencyContactPhone || null)
    .input('profileStatus', sql.NVarChar(20), data.profileStatus || null));
  return { patient: result.recordset[0], before: before.recordset[0] };
};

const remove = async (id) => withTransaction(async (transaction) => {
  const dependencyResult = await transaction.request().input('id', sql.Int, id).query(`
    SELECT
      (SELECT COUNT_BIG(1) FROM Users WHERE PatientId=@id) AS UsersCount,
      (SELECT COUNT_BIG(1) FROM PatientAssignments WHERE PatientId=@id) AS AssignmentsCount,
      (SELECT COUNT_BIG(1) FROM MedicalCases WHERE PatientId=@id) AS CasesCount,
      (SELECT COUNT_BIG(1) FROM PatientGyneHistories WHERE PatientId=@id) AS GyneHistoryCount,
      (SELECT COUNT_BIG(1) FROM ObstetricHistory WHERE PatientId=@id) AS ObstetricHistoryCount,
      (SELECT COUNT_BIG(1) FROM Pregnancies WHERE PatientId=@id) AS PregnanciesCount,
      (SELECT COUNT_BIG(1) FROM Appointments WHERE PatientId=@id) AS AppointmentsCount,
      (SELECT COUNT_BIG(1) FROM QueueEntries WHERE PatientId=@id) AS QueueEntriesCount,
      (SELECT COUNT_BIG(1) FROM Visits WHERE PatientId=@id) AS VisitsCount,
      (SELECT COUNT_BIG(1) FROM Medications WHERE PatientId=@id) AS MedicationsCount,
      (SELECT COUNT_BIG(1) FROM Allergies WHERE PatientId=@id) AS AllergiesCount,
      (SELECT COUNT_BIG(1) FROM LabTests WHERE PatientId=@id) AS LabsCount,
      (SELECT COUNT_BIG(1) FROM Ultrasounds WHERE PatientId=@id) AS UltrasoundsCount,
      (SELECT COUNT_BIG(1) FROM Documents WHERE PatientId=@id) AS DocumentsCount,
      (SELECT COUNT_BIG(1) FROM ProgressIndicators WHERE PatientId=@id) AS ProgressCount,
      (SELECT COUNT_BIG(1) FROM Notifications WHERE PatientId=@id) AS NotificationsCount;
  `);
  const counts = dependencyResult.recordset[0] || {};
  const blockers = [
    ['حسابات الدخول', counts.UsersCount],
    ['التعيينات', counts.AssignmentsCount],
    ['الحالات الطبية', counts.CasesCount],
    ['التاريخ النسائي', counts.GyneHistoryCount],
    ['التاريخ التوليدي', counts.ObstetricHistoryCount],
    ['سجلات الحمل', counts.PregnanciesCount],
    ['الحجوزات', counts.AppointmentsCount],
    ['عناصر الطابور', counts.QueueEntriesCount],
    ['الزيارات الطبية', counts.VisitsCount],
    ['الأدوية', counts.MedicationsCount],
    ['الحساسيات', counts.AllergiesCount],
    ['التحاليل', counts.LabsCount],
    ['السونار', counts.UltrasoundsCount],
    ['المستندات', counts.DocumentsCount],
    ['مؤشرات المتابعة', counts.ProgressCount],
    ['الإشعارات', counts.NotificationsCount]
  ].filter(([, count]) => Number(count) > 0);
  if (blockers.length) {
    throw new AppError(`لا يمكن حذف سجل المريضة نهائيًا لأنه مرتبط بـ ${blockers.map(([label, count]) => `${label} (${count})`).join('، ')}. احذف السجلات التشغيلية المرتبطة حسب السياسة أو عطّل السجل.`, 409, 'PATIENT_HAS_REFERENCES', { blockers });
  }
  const result = await transaction.request().input('id', sql.Int, id).query('DELETE FROM Patients OUTPUT DELETED.Id, DELETED.PatientCode, DELETED.FullName WHERE Id=@id');
  return result.recordset[0] || null;
});

const getDeleteTarget = async (id) => {
  const result = await query('SELECT TOP 1 Id, PatientCode, FullName, Status, ProfileStatus FROM Patients WHERE Id=@id', (request) => request.input('id', sql.Int, id));
  return result.recordset[0] || null;
};

const assign = async ({ patientId, doctorId, assignmentType, caseId, assignedBy }) => withTransaction(async (transaction) => {
  const doctor = await transaction.request().input('doctorId', sql.Int, doctorId).query('SELECT TOP 1 Id FROM Doctors WHERE Id=@doctorId AND Status=N\'active\'');
  if (!doctor.recordset[0]) throw new AppError('The selected doctor is not active.', 400, 'DOCTOR_NOT_ACTIVE');
  if (caseId) {
    const medicalCase = await transaction.request().input('patientId', sql.Int, patientId).input('caseId', sql.Int, caseId).query('SELECT TOP 1 Id FROM MedicalCases WHERE Id=@caseId AND PatientId=@patientId');
    if (!medicalCase.recordset[0]) throw new AppError('The selected case does not belong to this patient.', 400, 'CASE_PATIENT_MISMATCH');
  }
  const request = transaction.request();
  request.input('patientId', sql.Int, patientId).input('doctorId', sql.Int, doctorId).input('assignmentType', sql.NVarChar(30), assignmentType).input('caseId', sql.Int, caseId || null).input('assignedBy', sql.Int, assignedBy);
  await request.query(`UPDATE PatientAssignments SET EndedAt = SYSUTCDATETIME() WHERE PatientId=@patientId AND AssignmentType=@assignmentType AND EndedAt IS NULL ${caseId ? 'AND CaseId=@caseId' : ''}`);
  const result = await transaction.request().input('patientId', sql.Int, patientId).input('doctorId', sql.Int, doctorId).input('assignmentType', sql.NVarChar(30), assignmentType).input('caseId', sql.Int, caseId || null).input('assignedBy', sql.Int, assignedBy)
    .query(`INSERT INTO PatientAssignments (PatientId, DoctorId, AssignmentType, CaseId, AssignedBy)
            OUTPUT INSERTED.Id, INSERTED.PatientId, INSERTED.DoctorId, INSERTED.AssignmentType, INSERTED.CaseId, INSERTED.AssignedAt
            VALUES (@patientId, @doctorId, @assignmentType, @caseId, @assignedBy)`);
  return result.recordset[0];
});

const getAssignments = async (patientId) => {
  const result = await query(`SELECT pa.Id, pa.AssignmentType, pa.CaseId, pa.AssignedAt, pa.EndedAt, d.Id AS DoctorId, d.FullName AS DoctorName, u.FullName AS AssignedByName
    FROM PatientAssignments pa JOIN Doctors d ON d.Id=pa.DoctorId LEFT JOIN Users u ON u.Id=pa.AssignedBy WHERE pa.PatientId=@patientId ORDER BY pa.AssignedAt DESC`, (request) => request.input('patientId', sql.Int, patientId));
  return result.recordset;
};

module.exports = { list, findPotentialDuplicates, create, getById, update, remove, getDeleteTarget, assign, getAssignments };
