const { query, withTransaction } = require('../../db/repository');
const { sql } = require('../../db/connection');
const { recalculateQueue } = require('../../utils/waiting-time');
const { clinicDateKey } = require('../../utils/date');
const { AppError } = require('../../utils/errors');

const ACTIVE_QUEUE_STATUSES = [
  'booked',
  'confirmed',
  'arrived',
  'waiting',
  'late',
  'in_consultation'
];

const QUEUE_STATUS_TRANSITIONS = Object.freeze({
  booked: ['confirmed', 'arrived', 'waiting', 'late', 'in_consultation', 'no_show', 'cancelled', 'skipped'],
  confirmed: ['arrived', 'waiting', 'late', 'in_consultation', 'no_show', 'cancelled', 'skipped'],
  arrived: ['waiting', 'late', 'in_consultation', 'no_show', 'cancelled', 'skipped'],
  waiting: ['late', 'in_consultation', 'no_show', 'cancelled', 'skipped'],
  late: ['waiting', 'in_consultation', 'completed', 'no_show', 'cancelled', 'skipped'],
  in_consultation: ['completed', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
  skipped: []
});

const dateKey = (value) => {
  if (value instanceof Date) return clinicDateKey(value);
  return String(value || '').slice(0, 10);
};

const queueList = async ({ doctorId, date }) => {
  const result = await query(`
    SELECT q.Id,q.AppointmentId,q.PatientId,p.PatientCode,p.FullName PatientName,q.DoctorId,d.FullName DoctorName,q.QueueDate,
      q.ServiceId,s.Name ServiceName,s.BaseDurationMinutes,a.StartAt AppointmentTime,a.ExpectedDurationMinutes,
      q.QueueNumber,q.Position,q.Status,q.CheckedInAt,q.ConsultationStartedAt,q.ConsultationEndedAt,
      q.ExpectedStartAt,q.ExpectedEndAt,q.ActualDurationMinutes
    FROM QueueEntries q
    JOIN Patients p ON p.Id=q.PatientId
    JOIN Doctors d ON d.Id=q.DoctorId
    JOIN Services s ON s.Id=q.ServiceId
    JOIN Appointments a ON a.Id=q.AppointmentId
    WHERE q.DoctorId=@doctorId AND COALESCE(q.QueueDate,CONVERT(date,a.StartAt))=@date
    ORDER BY q.Position,q.CreatedAt;

    SELECT TOP 1 dp.Id,dp.StartedAt,dp.ResumedAt,dp.Status,dp.Reason
    FROM DoctorPauses dp
    WHERE dp.DoctorId=@doctorId AND CONVERT(date,dp.StartedAt)=@date
    ORDER BY dp.StartedAt DESC;
  `, (request) => request
    .input('doctorId', sql.Int, doctorId)
    .input('date', sql.Date, date));

  return {
    entries: result.recordsets[0],
    pause: result.recordsets[1][0] || null
  };
};

const setStatus = async (id, status) => withTransaction(async (transaction) => {
  const currentResult = await transaction.request()
    .input('id', sql.Int, id)
    .query('SELECT TOP 1 * FROM QueueEntries WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id');
  const current = currentResult.recordset[0];
  if (!current) return null;
  if (current.Status === status) return current;
  if (!(QUEUE_STATUS_TRANSITIONS[current.Status] || []).includes(status)) {
    throw new AppError(`لا يمكن نقل الدور من «${current.Status}» إلى «${status}».`, 409, 'INVALID_QUEUE_TRANSITION', { from: current.Status, to: status });
  }
  const result = await transaction.request()
    .input('id', sql.Int, id)
    .input('status', sql.NVarChar(30), status)
    .query(`
      UPDATE q
      SET Status=@status,
        CheckedInAt=CASE WHEN @status IN (N'arrived',N'waiting',N'late',N'in_consultation') AND q.CheckedInAt IS NULL THEN SYSUTCDATETIME() ELSE q.CheckedInAt END,
        ConsultationStartedAt=CASE WHEN @status=N'in_consultation' THEN COALESCE(q.ConsultationStartedAt,SYSUTCDATETIME()) ELSE q.ConsultationStartedAt END,
        ConsultationEndedAt=CASE WHEN @status=N'completed' THEN SYSUTCDATETIME() ELSE q.ConsultationEndedAt END,
        ActualDurationMinutes=CASE WHEN @status=N'completed' AND q.ConsultationStartedAt IS NOT NULL THEN DATEDIFF(MINUTE,q.ConsultationStartedAt,SYSUTCDATETIME()) ELSE q.ActualDurationMinutes END,
        UpdatedAt=SYSUTCDATETIME()
      OUTPUT INSERTED.*
      FROM QueueEntries q
      WHERE q.Id=@id;
    `);

  const entry = result.recordset[0] || null;
  if (!entry) return null;

  await transaction.request()
    .input('appointmentId', sql.Int, entry.AppointmentId)
    .input('status', sql.NVarChar(30), status)
    .query(`
      UPDATE Appointments
      SET Status=@status, UpdatedAt=SYSUTCDATETIME()
      WHERE Id=@appointmentId AND @status IN (N'completed',N'no_show',N'cancelled',N'skipped',N'arrived',N'waiting',N'late',N'in_consultation');
    `);

  return entry;
});

const reorder = async (id, position) => withTransaction(async (transaction) => {
  const current = await transaction.request()
    .input('id', sql.Int, id)
    .query('SELECT DoctorId,Position,Status,COALESCE(QueueDate,CONVERT(date,a.StartAt)) QueueDate FROM QueueEntries q JOIN Appointments a ON a.Id=q.AppointmentId WHERE q.Id=@id');
  const row = current.recordset[0];
  if (!row) return null;
  if (!ACTIVE_QUEUE_STATUSES.includes(row.Status)) throw new AppError('لا يمكن إعادة ترتيب دور غير نشط.', 409, 'QUEUE_ENTRY_NOT_ACTIVE');

  const targetPosition = Math.max(1, Number(position));
  const activeFilter = `DoctorId=@doctorId AND QueueDate=@queueDate AND Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')`;

  if (targetPosition < row.Position) {
    await transaction.request()
      .input('doctorId', sql.Int, row.DoctorId)
      .input('queueDate', sql.Date, row.QueueDate)
      .input('fromPosition', sql.Int, targetPosition)
      .input('toPosition', sql.Int, row.Position)
      .input('id', sql.Int, id)
      .query(`UPDATE QueueEntries SET Position=Position+1,UpdatedAt=SYSUTCDATETIME() WHERE ${activeFilter} AND Position>=@fromPosition AND Position<@toPosition AND Id<>@id`);
  } else if (targetPosition > row.Position) {
    await transaction.request()
      .input('doctorId', sql.Int, row.DoctorId)
      .input('queueDate', sql.Date, row.QueueDate)
      .input('fromPosition', sql.Int, row.Position)
      .input('toPosition', sql.Int, targetPosition)
      .input('id', sql.Int, id)
      .query(`UPDATE QueueEntries SET Position=Position-1,UpdatedAt=SYSUTCDATETIME() WHERE ${activeFilter} AND Position>@fromPosition AND Position<=@toPosition AND Id<>@id`);
  }

  const updated = await transaction.request()
    .input('id', sql.Int, id)
    .input('position', sql.Int, targetPosition)
    .query('UPDATE QueueEntries SET Position=@position,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id');
  return updated.recordset[0];
});

const pause = async (data) => {
  const result = await query(`
    INSERT INTO DoctorPauses (DoctorId,StartedAt,Status,Reason,CreatedBy)
    OUTPUT INSERTED.*
    VALUES (@doctorId,COALESCE(@startedAt,SYSUTCDATETIME()),N'paused',@reason,@createdBy)
  `, (request) => request
    .input('doctorId', sql.Int, data.doctorId)
    .input('startedAt', sql.DateTime2, data.startedAt || null)
    .input('reason', sql.NVarChar(500), data.reason || null)
    .input('createdBy', sql.Int, data.createdBy));
  return result.recordset[0];
};

const resume = async (id) => {
  const result = await query(`
    UPDATE DoctorPauses
    SET ResumedAt=SYSUTCDATETIME(),Status=N'resumed'
    OUTPUT INSERTED.*
    WHERE Id=@id AND Status=N'paused'
  `, (request) => request.input('id', sql.Int, id));
  return result.recordset[0] || null;
};

const recalculateForDoctor = async (doctorId, date) => withTransaction(async (transaction) => {
  const queueDate = dateKey(date);
  const result = await transaction.request()
    .input('doctorId', sql.Int, doctorId)
    .input('queueDate', sql.Date, queueDate)
    .query(`
      SELECT q.Id,q.AppointmentId,q.Position,q.CreatedAt,q.ConsultationStartedAt,a.StartAt,
        s.BaseDurationMinutes,
        COALESCE(hist.AvgActualDuration,s.BaseDurationMinutes)-s.BaseDurationMinutes AS DoctorAdjustment,
        COALESCE(today.AvgActualDuration,hist.AvgActualDuration,s.BaseDurationMinutes)
          -COALESCE(hist.AvgActualDuration,s.BaseDurationMinutes) AS CurrentDayAdjustment
      FROM QueueEntries q
      JOIN Appointments a ON a.Id=q.AppointmentId
      JOIN Services s ON s.Id=q.ServiceId
      OUTER APPLY (
        SELECT AVG(CAST(history.ActualDurationMinutes AS DECIMAL(10,2))) AvgActualDuration
        FROM QueueEntries history
        WHERE history.DoctorId=q.DoctorId AND history.ServiceId=q.ServiceId
          AND history.Status=N'completed' AND history.ActualDurationMinutes IS NOT NULL
          AND history.ConsultationEndedAt>=DATEADD(DAY,-30,SYSUTCDATETIME())
      ) hist
      OUTER APPLY (
        SELECT AVG(CAST(todayQueue.ActualDurationMinutes AS DECIMAL(10,2))) AvgActualDuration
        FROM QueueEntries todayQueue
        WHERE todayQueue.DoctorId=q.DoctorId AND todayQueue.ServiceId=q.ServiceId
          AND todayQueue.Status=N'completed' AND todayQueue.ActualDurationMinutes IS NOT NULL
          AND CONVERT(date,todayQueue.CreatedAt)=@queueDate
      ) today
      WHERE q.DoctorId=@doctorId AND COALESCE(q.QueueDate,CONVERT(date,a.StartAt))=@queueDate
        AND q.Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')
      ORDER BY q.Position,q.CreatedAt;

      SELECT StartedAt,COALESCE(ResumedAt,DATEADD(DAY,1,CONVERT(datetime2,@queueDate))) EndAt
      FROM DoctorPauses
      WHERE DoctorId=@doctorId
        AND StartedAt<DATEADD(DAY,1,CONVERT(datetime2,@queueDate))
        AND COALESCE(ResumedAt,DATEADD(DAY,1,CONVERT(datetime2,@queueDate)))>CONVERT(datetime2,@queueDate);
    `);

  const rows = result.recordsets[0];
  if (!rows.length) return [];

  const now = new Date();
  const todayKey = clinicDateKey(now);
  const appointmentStarts = rows.map((row) => new Date(row.StartAt).getTime()).filter(Number.isFinite);
  const earliestStart = appointmentStarts.length ? Math.min(...appointmentStarts) : now.getTime();
  const anchor = queueDate === todayKey
    ? new Date(Math.max(now.getTime(), earliestStart))
    : new Date(earliestStart);

  const recalculated = recalculateQueue(rows.map((row) => ({
    id: row.Id,
    appointmentId: row.AppointmentId,
    position: row.Position,
    baseDurationMinutes: row.BaseDurationMinutes,
    doctorAdjustment: Number(row.DoctorAdjustment || 0),
    currentDayAdjustment: Number(row.CurrentDayAdjustment || 0)
  })), anchor, result.recordsets[1]);

  const queueValues = recalculated.map((row, index) => `(@queueId${index},@position${index},@duration${index},@start${index},@end${index})`).join(',');
  const queueRequest = transaction.request();
  recalculated.forEach((row, index) => {
    queueRequest.input(`queueId${index}`, sql.Int, row.id)
      .input(`position${index}`, sql.Int, row.position)
      .input(`duration${index}`, sql.Int, row.expectedDurationMinutes)
      .input(`start${index}`, sql.DateTime2, row.expectedStartAt)
      .input(`end${index}`, sql.DateTime2, row.expectedEndAt);
  });
  await queueRequest.query(`
    UPDATE q
    SET Position=v.Position,ExpectedDurationMinutes=v.Duration,ExpectedStartAt=v.ExpectedStartAt,
      ExpectedEndAt=v.ExpectedEndAt,UpdatedAt=SYSUTCDATETIME()
    FROM QueueEntries q
    JOIN (VALUES ${queueValues}) v(Id,Position,Duration,ExpectedStartAt,ExpectedEndAt) ON v.Id=q.Id;
  `);

  const appointmentValues = recalculated.map((row, index) => `(@appointmentId${index},@appointmentDuration${index},@appointmentEnd${index})`).join(',');
  const appointmentRequest = transaction.request();
  recalculated.forEach((row, index) => {
    appointmentRequest.input(`appointmentId${index}`, sql.Int, row.appointmentId)
      .input(`appointmentDuration${index}`, sql.Int, row.expectedDurationMinutes)
      .input(`appointmentEnd${index}`, sql.DateTime2, row.expectedEndAt);
  });
  await appointmentRequest.query(`
    UPDATE a
    SET ExpectedDurationMinutes=v.Duration,EndAt=v.ExpectedEndAt,UpdatedAt=SYSUTCDATETIME()
    FROM Appointments a
    JOIN (VALUES ${appointmentValues}) v(Id,Duration,ExpectedEndAt) ON v.Id=a.Id;
  `);

  return recalculated;
});

module.exports = { list: queueList, setStatus, reorder, pause, resume, recalculateForDoctor, ACTIVE_QUEUE_STATUSES, QUEUE_STATUS_TRANSITIONS };
