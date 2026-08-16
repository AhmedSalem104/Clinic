const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { AppError } = require('../../utils/errors');
const crypto = require('node:crypto');

const ACTIVE_APPOINTMENT_STATUSES = [
  'booked',
  'confirmed',
  'arrived',
  'waiting',
  'in_consultation',
  'late'
];

const APPOINTMENT_STATUS_TRANSITIONS = Object.freeze({
  booked: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['cancelled', 'no_show'],
  arrived: ['cancelled', 'no_show'],
  waiting: ['cancelled', 'no_show'],
  late: ['cancelled', 'no_show'],
  in_consultation: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
  skipped: []
});

const clockToMinutes = (value) => {
  if (value instanceof Date) return value.getUTCHours() * 60 + value.getUTCMinutes();
  const [hours = 0, minutes = 0] = String(value || '0:0').split(':').map(Number);
  return (hours * 60) + minutes;
};

const parseBreaks = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const overlaps = (start, end, otherStart, otherEnd) => start < otherEnd && end > otherStart;

const list = async ({ user, pageSize, offset, date, status, doctorId, serviceId, search }) => {
  const doctorScope = user?.role === 'doctor' ? 'AND a.DoctorId=@scopeDoctorId' : '';
  const patientScope = user?.role === 'patient' ? 'AND a.PatientId=@scopePatientId' : '';
  const result = await query(`
    SELECT a.Id,a.PatientId,p.PatientCode,p.FullName PatientName,p.Phone,a.DoctorId,d.FullName DoctorName,a.ServiceId,s.Name ServiceName,
      a.BookingSource,a.StartAt,a.EndAt,a.ExpectedDurationMinutes,a.Price,a.Status,a.CreatedAt
    FROM Appointments a JOIN Patients p ON p.Id=a.PatientId JOIN Doctors d ON d.Id=a.DoctorId JOIN Services s ON s.Id=a.ServiceId
    WHERE (@date IS NULL OR (a.StartAt>=CONVERT(datetime2,@date) AND a.StartAt<DATEADD(DAY,1,CONVERT(datetime2,@date))))
      AND (@status=N'' OR a.Status=@status) AND (@doctorId IS NULL OR a.DoctorId=@doctorId) AND (@serviceId IS NULL OR a.ServiceId=@serviceId)
      AND (@search=N'' OR p.NormalizedName LIKE N'%'+@search+N'%' OR p.NormalizedPhone LIKE N'%'+@search+N'%' OR p.PatientCode LIKE N'%'+@search+N'%')
      ${doctorScope} ${patientScope}
    ORDER BY a.StartAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT_BIG(1) Total FROM Appointments a JOIN Patients p ON p.Id=a.PatientId
    WHERE (@date IS NULL OR (a.StartAt>=CONVERT(datetime2,@date) AND a.StartAt<DATEADD(DAY,1,CONVERT(datetime2,@date)))) AND (@status=N'' OR a.Status=@status) AND (@doctorId IS NULL OR a.DoctorId=@doctorId) AND (@serviceId IS NULL OR a.ServiceId=@serviceId)
      AND (@search=N'' OR p.NormalizedName LIKE N'%'+@search+N'%' OR p.NormalizedPhone LIKE N'%'+@search+N'%' OR p.PatientCode LIKE N'%'+@search+N'%') ${doctorScope} ${patientScope};
  `, (request) => request
    .input('date', sql.Date, date || null)
    .input('status', sql.NVarChar(30), status || '')
    .input('doctorId', sql.Int, doctorId || null)
    .input('serviceId', sql.Int, serviceId || null)
    .input('search', sql.NVarChar(180), search || '')
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .input('scopeDoctorId', sql.Int, user?.doctorId || null)
    .input('scopePatientId', sql.Int, user?.patientId || null));
  return { rows: result.recordsets[0], total: Number(result.recordsets[1][0].Total) };
};

const loadScheduleContext = async (request, doctorId, serviceId, startAt) => {
  const result = await request
    .input('doctorId', sql.Int, doctorId)
    .input('serviceId', sql.Int, serviceId)
    .input('date', sql.Date, new Date(startAt))
    .input('startAt', sql.DateTime2, startAt)
    .query(`
      SELECT TOP 1 s.BaseDurationMinutes,
        COALESCE((SELECT TOP 1 p.Price FROM Pricing p WHERE p.DoctorId=@doctorId AND p.ServiceId=@serviceId AND p.IsActive=1
          AND p.EffectiveFrom<=CONVERT(date,@startAt) AND (p.EffectiveTo IS NULL OR p.EffectiveTo>=CONVERT(date,@startAt)) ORDER BY p.EffectiveFrom DESC),0) Price,
        s.RequiresQueue
      FROM Services s
      JOIN DoctorServices ds ON ds.ServiceId=s.Id AND ds.DoctorId=@doctorId AND ds.IsActive=1
      JOIN Doctors d ON d.Id=ds.DoctorId AND d.Status=N'active'
      WHERE s.Id=@serviceId AND s.IsActive=1;

      SELECT TOP 1 DayOfWeek,StartTime,EndTime,BreaksJson
      FROM DoctorSchedules
      WHERE DoctorId=@doctorId AND IsActive=1 AND DayOfWeek=(DATEDIFF(DAY, CONVERT(date,'19000107'), CONVERT(date,@startAt)) % 7)
      ORDER BY StartTime;

      SELECT ExceptionDate,StartTime,EndTime,ExceptionType,Reason
      FROM ScheduleExceptions
      WHERE DoctorId=@doctorId AND ExceptionDate=CONVERT(date,@startAt);

      SELECT StartedAt,COALESCE(ResumedAt,DATEADD(DAY,1,CONVERT(datetime2,CONVERT(date,@startAt)))) EndAt
      FROM DoctorPauses
      WHERE DoctorId=@doctorId AND StartedAt<DATEADD(DAY,1,CONVERT(datetime2,CONVERT(date,@startAt)))
        AND COALESCE(ResumedAt,DATEADD(DAY,1,CONVERT(datetime2,CONVERT(date,@startAt))))>CONVERT(datetime2,CONVERT(date,@startAt));
    `);
  return {
    service: result.recordsets[0][0],
    schedule: result.recordsets[1][0] || null,
    exceptions: result.recordsets[2],
    pauses: result.recordsets[3]
  };
};

const validateBookableTime = ({ context, startAt }) => {
  if (!context.service) throw new AppError('الخدمة المختارة غير متاحة مع هذا الطبيب. اختاري خدمة أخرى أو طبيبًا آخر.', 400, 'SERVICE_NOT_AVAILABLE');
  if (!context.schedule) throw new AppError('لا يوجد جدول عمل للطبيب في التاريخ المختار. اختاري تاريخًا آخر.', 409, 'SCHEDULE_UNAVAILABLE');

  const start = new Date(startAt);
  const end = new Date(start.getTime() + context.service.BaseDurationMinutes * 60000);
  // Schedule fields are clinic wall-clock values. The timestamp remains an
  // instant, but the comparison must use the configured clinic timezone.
  const startMinute = start.getHours() * 60 + start.getMinutes();
  const endMinute = startMinute + context.service.BaseDurationMinutes;
  let scheduleStart = clockToMinutes(context.schedule.StartTime);
  let scheduleEnd = clockToMinutes(context.schedule.EndTime);

  const exception = context.exceptions.find((item) => ['vacation', 'unavailable'].includes(item.ExceptionType));
  if (exception) throw new AppError('الطبيب غير متاح في التاريخ المختار. اختاري تاريخًا آخر.', 409, 'DOCTOR_UNAVAILABLE');
  const special = context.exceptions.find((item) => item.ExceptionType === 'special' && item.StartTime && item.EndTime);
  if (special) {
    scheduleStart = clockToMinutes(special.StartTime);
    scheduleEnd = clockToMinutes(special.EndTime);
  }

  if (startMinute < scheduleStart || endMinute > scheduleEnd) {
    throw new AppError('الوقت المختار خارج ساعات عمل الطبيب. اختاري وقتًا من المواعيد المتاحة.', 409, 'OUTSIDE_SCHEDULE');
  }

  const breaks = parseBreaks(context.schedule.BreaksJson);
  const blockedBreak = breaks.some((item) => {
    const breakStart = clockToMinutes(item.start || item.StartTime || item.from);
    const breakEnd = clockToMinutes(item.end || item.EndTime || item.to);
    return overlaps(startMinute, endMinute, breakStart, breakEnd);
  });
  if (blockedBreak) throw new AppError('الوقت المختار يتعارض مع فترة راحة الطبيب. اختاري وقتًا آخر.', 409, 'SCHEDULE_BREAK');

  const blockedPause = context.pauses.some((item) => overlaps(start.getTime(), end.getTime(), new Date(item.StartedAt).getTime(), new Date(item.EndAt).getTime()));
  if (blockedPause) throw new AppError('الطبيب متوقف مؤقتًا خلال الوقت المختار. اختاري موعدًا آخر.', 409, 'DOCTOR_PAUSED');
};

const availableSlots = async ({ doctorId, serviceId, date }) => {
  const result = await query(`
    SELECT TOP 1 s.BaseDurationMinutes,
      COALESCE((SELECT TOP 1 p.Price FROM Pricing p WHERE p.DoctorId=@doctorId AND p.ServiceId=@serviceId AND p.IsActive=1
        AND p.EffectiveFrom<=@date AND (p.EffectiveTo IS NULL OR p.EffectiveTo>=@date) ORDER BY p.EffectiveFrom DESC),0) Price
    FROM Services s
    JOIN DoctorServices ds ON ds.ServiceId=s.Id AND ds.DoctorId=@doctorId AND ds.IsActive=1
    JOIN Doctors d ON d.Id=ds.DoctorId AND d.Status=N'active'
    WHERE s.Id=@serviceId AND s.IsActive=1;
    SELECT TOP 1 DayOfWeek,StartTime,EndTime,BreaksJson FROM DoctorSchedules
    WHERE DoctorId=@doctorId AND IsActive=1 AND DayOfWeek=(DATEDIFF(DAY, CONVERT(date,'19000107'), @date) % 7) ORDER BY StartTime;
    SELECT ExceptionDate,StartTime,EndTime,ExceptionType,Reason FROM ScheduleExceptions WHERE DoctorId=@doctorId AND ExceptionDate=@date;
    SELECT StartedAt,COALESCE(ResumedAt,DATEADD(DAY,1,CONVERT(datetime2,@date))) EndAt FROM DoctorPauses
    WHERE DoctorId=@doctorId AND StartedAt<DATEADD(DAY,1,CONVERT(datetime2,@date)) AND COALESCE(ResumedAt,DATEADD(DAY,1,CONVERT(datetime2,@date)))>CONVERT(datetime2,@date);
    SELECT StartAt,ExpectedDurationMinutes FROM Appointments WHERE DoctorId=@doctorId AND StartAt>=CONVERT(datetime2,@date) AND StartAt<DATEADD(DAY,1,CONVERT(datetime2,@date)) AND Status NOT IN (N'cancelled',N'no_show');
  `, (request) => request
    .input('doctorId', sql.Int, doctorId)
    .input('serviceId', sql.Int, serviceId)
    .input('date', sql.Date, date));
  return {
    service: result.recordsets[0][0],
    schedules: result.recordsets[1],
    exceptions: result.recordsets[2],
    pauses: result.recordsets[3],
    booked: result.recordsets[4]
  };
};

const ensurePrimaryAssignmentInTransaction = async (transaction, patientId, doctorId) => {
  const existing = await transaction.request()
    .input('patientId', sql.Int, patientId)
    .query(`SELECT TOP 1 Id,DoctorId FROM PatientAssignments WITH (UPDLOCK,HOLDLOCK)
      WHERE PatientId=@patientId AND AssignmentType=N'primary' AND EndedAt IS NULL
      ORDER BY AssignedAt DESC`);
  if (existing.recordset[0]) return { ...existing.recordset[0], Created: false };

  const result = await transaction.request()
    .input('patientId', sql.Int, patientId)
    .input('doctorId', sql.Int, doctorId)
    .input('assignedBy', sql.Int, null)
    .query(`INSERT INTO PatientAssignments (PatientId,DoctorId,AssignmentType,AssignedBy)
      OUTPUT INSERTED.Id,INSERTED.DoctorId
      VALUES (@patientId,@doctorId,N'primary',@assignedBy)`);
  return { ...result.recordset[0], Created: true };
};

const createInTransaction = async (transaction, { patientId, doctorId, serviceId, bookingSource, startAt, notes, createdBy }) => {
  const primaryAssignment = await ensurePrimaryAssignmentInTransaction(transaction, patientId, doctorId);
  const context = await loadScheduleContext(transaction.request(), doctorId, serviceId, startAt);
  validateBookableTime({ context, startAt });

  const service = context.service;
  const endAt = new Date(new Date(startAt).getTime() + service.BaseDurationMinutes * 60000);
  const overlap = await transaction.request()
    .input('doctorId', sql.Int, doctorId)
    .input('startAt', sql.DateTime2, startAt)
    .input('endAt', sql.DateTime2, endAt)
    .query(`
      SELECT TOP 1 Id FROM Appointments WITH (UPDLOCK,HOLDLOCK)
      WHERE DoctorId=@doctorId AND Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'in_consultation',N'late')
        AND StartAt<@endAt AND COALESCE(EndAt,DATEADD(MINUTE,ExpectedDurationMinutes,StartAt))>@startAt;
    `);
  if (overlap.recordset[0]) throw new AppError('هذا الموعد محجوز بالفعل. اختاري وقتًا آخر من المواعيد المتاحة.', 409, 'OVERLAPPING_BOOKING');

  const trackingToken = crypto.randomBytes(24).toString('hex');
  const appointmentResult = await transaction.request()
    .input('patientId', sql.Int, patientId)
    .input('doctorId', sql.Int, doctorId)
    .input('serviceId', sql.Int, serviceId)
    .input('bookingSource', sql.NVarChar(30), bookingSource || 'reception')
    .input('startAt', sql.DateTime2, startAt)
    .input('endAt', sql.DateTime2, endAt)
    .input('duration', sql.Int, service.BaseDurationMinutes)
    .input('price', sql.Decimal(12, 2), service.Price)
    .input('trackingToken', sql.NVarChar(64), trackingToken)
    .input('notes', sql.NVarChar(1000), notes || null)
    .input('createdBy', sql.Int, createdBy)
    .query(`
      INSERT INTO Appointments (PatientId,DoctorId,ServiceId,BookingSource,StartAt,EndAt,ExpectedDurationMinutes,Price,Status,PublicTrackingToken,Notes,CreatedBy)
      OUTPUT INSERTED.*
      VALUES (@patientId,@doctorId,@serviceId,@bookingSource,@startAt,@endAt,@duration,@price,N'booked',@trackingToken,@notes,@createdBy);
    `);
  const appointment = appointmentResult.recordset[0];

  if (service.RequiresQueue) {
    const queueNumber = await transaction.request()
      .input('doctorId', sql.Int, doctorId)
      .input('date', sql.Date, new Date(startAt))
      .query('SELECT COALESCE(MAX(QueueNumber),0)+1 NextNumber FROM QueueEntries WITH (UPDLOCK,HOLDLOCK) WHERE DoctorId=@doctorId AND QueueDate=@date');
    const position = await transaction.request()
      .input('doctorId', sql.Int, doctorId)
      .input('date', sql.Date, new Date(startAt))
      .query(`SELECT COUNT(1)+1 NextPosition FROM QueueEntries WITH (UPDLOCK,HOLDLOCK) WHERE DoctorId=@doctorId AND QueueDate=@date AND Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')`);
    await transaction.request()
      .input('appointmentId', sql.Int, appointment.Id)
      .input('patientId', sql.Int, patientId)
      .input('doctorId', sql.Int, doctorId)
      .input('serviceId', sql.Int, serviceId)
      .input('queueDate', sql.Date, new Date(startAt))
      .input('queueNumber', sql.Int, queueNumber.recordset[0].NextNumber)
      .input('position', sql.Int, position.recordset[0].NextPosition)
      .input('duration', sql.Int, service.BaseDurationMinutes)
      .query(`INSERT INTO QueueEntries (AppointmentId,PatientId,DoctorId,ServiceId,QueueNumber,Position,QueueDate,Status,ExpectedDurationMinutes) VALUES (@appointmentId,@patientId,@doctorId,@serviceId,@queueNumber,@position,@queueDate,N'booked',@duration)`);
  }
  appointment.PrimaryAssignmentCreated = primaryAssignment.Created;
  return appointment;
};

const create = async (payload) => withTransaction(async (transaction) => createInTransaction(transaction, payload));

const getById = async (id) => {
  const result = await query(`SELECT a.*,p.FullName PatientName,p.PatientCode,p.Phone,d.FullName DoctorName,s.Name ServiceName,s.BaseDurationMinutes,s.RequiresQueue FROM Appointments a JOIN Patients p ON p.Id=a.PatientId JOIN Doctors d ON d.Id=a.DoctorId JOIN Services s ON s.Id=a.ServiceId WHERE a.Id=@id`, (request) => request.input('id', sql.Int, id));
  return result.recordset[0] || null;
};

const reschedule = async (id, startAt) => withTransaction(async (transaction) => {
  const currentResult = await transaction.request().input('id', sql.Int, id).query(`SELECT a.*,s.BaseDurationMinutes,s.RequiresQueue FROM Appointments a WITH (UPDLOCK,HOLDLOCK) JOIN Services s ON s.Id=a.ServiceId WHERE a.Id=@id`);
  const current = currentResult.recordset[0];
  if (!current) throw new AppError('الموعد غير موجود أو تم حذفه.', 404, 'APPOINTMENT_NOT_FOUND');
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(current.Status)) throw new AppError('لا يمكن إعادة جدولة هذا الموعد لأن حالته الحالية لا تسمح بذلك.', 409, 'APPOINTMENT_NOT_RESCHEDULABLE');
  const context = await loadScheduleContext(transaction.request(), current.DoctorId, current.ServiceId, startAt);
  validateBookableTime({ context, startAt });
  const endAt = new Date(new Date(startAt).getTime() + current.BaseDurationMinutes * 60000);
  const overlap = await transaction.request().input('id', sql.Int, id).input('doctorId', sql.Int, current.DoctorId).input('startAt', sql.DateTime2, startAt).input('endAt', sql.DateTime2, endAt).query(`SELECT TOP 1 Id FROM Appointments WITH (UPDLOCK,HOLDLOCK) WHERE Id<>@id AND DoctorId=@doctorId AND Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'in_consultation',N'late') AND StartAt<@endAt AND COALESCE(EndAt,DATEADD(MINUTE,ExpectedDurationMinutes,StartAt))>@startAt`);
  if (overlap.recordset[0]) throw new AppError('هذا الموعد محجوز بالفعل. اختاري وقتًا آخر من المواعيد المتاحة.', 409, 'OVERLAPPING_BOOKING');
  const updated = await transaction.request().input('id', sql.Int, id).input('startAt', sql.DateTime2, startAt).input('endAt', sql.DateTime2, endAt).query('UPDATE Appointments SET StartAt=@startAt,EndAt=@endAt,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id');
  if (current.RequiresQueue) {
    const queue = await transaction.request().input('appointmentId', sql.Int, id).query('SELECT TOP 1 Id,QueueDate FROM QueueEntries WITH (UPDLOCK,HOLDLOCK) WHERE AppointmentId=@appointmentId');
    if (queue.recordset[0]) {
      const newDate = new Date(startAt);
      const nextNumber = await transaction.request().input('doctorId', sql.Int, current.DoctorId).input('queueDate', sql.Date, newDate).input('queueId', sql.Int, queue.recordset[0].Id).query('SELECT COALESCE(MAX(QueueNumber),0)+1 NextNumber FROM QueueEntries WITH (UPDLOCK,HOLDLOCK) WHERE DoctorId=@doctorId AND QueueDate=@queueDate AND Id<>@queueId');
      const nextPosition = await transaction.request().input('doctorId', sql.Int, current.DoctorId).input('queueDate', sql.Date, newDate).input('queueId', sql.Int, queue.recordset[0].Id).query(`SELECT COUNT(1)+1 NextPosition FROM QueueEntries WITH (UPDLOCK,HOLDLOCK) WHERE DoctorId=@doctorId AND QueueDate=@queueDate AND Id<>@queueId AND Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')`);
      await transaction.request().input('queueId', sql.Int, queue.recordset[0].Id).input('queueDate', sql.Date, newDate).input('queueNumber', sql.Int, nextNumber.recordset[0].NextNumber).input('position', sql.Int, nextPosition.recordset[0].NextPosition).query('UPDATE QueueEntries SET QueueDate=@queueDate,QueueNumber=@queueNumber,Position=@position,UpdatedAt=SYSUTCDATETIME() WHERE Id=@queueId');
    }
  }
  return updated.recordset[0];
});

const updateStatus = async (id, status, reason) => withTransaction(async (transaction) => {
  const currentResult = await transaction.request().input('id', sql.Int, id).query('SELECT TOP 1 * FROM Appointments WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id');
  const current = currentResult.recordset[0];
  if (!current) return null;
  if (current.Status === status) return current;
  if (!(APPOINTMENT_STATUS_TRANSITIONS[current.Status] || []).includes(status)) {
    throw new AppError(`لا يمكن نقل حالة الموعد من «${current.Status}» إلى «${status}».`, 409, 'INVALID_APPOINTMENT_TRANSITION', { from: current.Status, to: status });
  }
  const result = await transaction.request().input('id', sql.Int, id).input('status', sql.NVarChar(30), status).input('reason', sql.NVarChar(500), reason || null).query(`UPDATE Appointments SET Status=@status,CancellationReason=@reason,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id`);
  const appointment = result.recordset[0] || null;
  if (appointment) await transaction.request().input('appointmentId', sql.Int, id).input('status', sql.NVarChar(30), status).query('UPDATE QueueEntries SET Status=@status,UpdatedAt=SYSUTCDATETIME() WHERE AppointmentId=@appointmentId');
  return appointment;
});

module.exports = { list, availableSlots, create, createInTransaction, getById, reschedule, updateStatus, ACTIVE_APPOINTMENT_STATUSES, APPOINTMENT_STATUS_TRANSITIONS, ensurePrimaryAssignmentInTransaction };
