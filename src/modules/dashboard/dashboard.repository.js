const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');

const today = async (user, date) => {
  const appointmentScope = user?.role === 'doctor' ? 'AND a.DoctorId=@doctorId' : '';
  const queueScope = user?.role === 'doctor' ? 'AND q.DoctorId=@doctorId' : '';
  const result = await query(`
    DECLARE @day date=@date;

    SELECT
      (SELECT COUNT(1) FROM Appointments a WHERE a.StartAt>=CONVERT(datetime2,@day) AND a.StartAt<DATEADD(DAY,1,CONVERT(datetime2,@day)) ${appointmentScope}) TotalBookings,
      (SELECT COUNT(1) FROM QueueEntries q JOIN Appointments qa ON qa.Id=q.AppointmentId WHERE COALESCE(q.QueueDate,CONVERT(date,qa.StartAt))=@day AND q.Status IN (N'arrived',N'waiting',N'late',N'in_consultation') ${queueScope}) ArrivedPatients,
      (SELECT COUNT(1) FROM QueueEntries q JOIN Appointments qa ON qa.Id=q.AppointmentId WHERE COALESCE(q.QueueDate,CONVERT(date,qa.StartAt))=@day AND q.Status IN (N'waiting',N'late') ${queueScope}) WaitingPatients,
      (SELECT COUNT(1) FROM QueueEntries q JOIN Appointments qa ON qa.Id=q.AppointmentId WHERE COALESCE(q.QueueDate,CONVERT(date,qa.StartAt))=@day AND q.Status=N'in_consultation' ${queueScope}) InConsultation,
      (SELECT COUNT(1) FROM Appointments a WHERE a.StartAt>=CONVERT(datetime2,@day) AND a.StartAt<DATEADD(DAY,1,CONVERT(datetime2,@day)) AND a.Status=N'completed' ${appointmentScope}) Completed,
      (SELECT COUNT(1) FROM Appointments a WHERE a.StartAt>=CONVERT(datetime2,@day) AND a.StartAt<DATEADD(DAY,1,CONVERT(datetime2,@day)) AND a.Status=N'no_show' ${appointmentScope}) NoShow,
      (SELECT COUNT(1) FROM Doctors d WHERE d.Status=N'active') ActiveDoctors,
      (SELECT COALESCE(AVG(CAST(DATEDIFF(MINUTE,q.CheckedInAt,q.ConsultationStartedAt) AS DECIMAL(10,2))),0) FROM QueueEntries q JOIN Appointments qa ON qa.Id=q.AppointmentId WHERE COALESCE(q.QueueDate,CONVERT(date,qa.StartAt))=@day AND q.CheckedInAt IS NOT NULL AND q.ConsultationStartedAt IS NOT NULL ${queueScope}) AverageWait,
      (SELECT COUNT(1) FROM DoctorPauses dp WHERE dp.StartedAt>=CONVERT(datetime2,@day) AND dp.StartedAt<DATEADD(DAY,1,CONVERT(datetime2,@day)) ${user?.role === 'doctor' ? 'AND dp.DoctorId=@doctorId' : ''}) DoctorPauses;

    SELECT TOP 8
      a.Id,
      a.PatientId,
      p.FullName PatientName,
      d.FullName DoctorName,
      s.Name ServiceName,
      a.StartAt,
      a.Status,
      q.Id QueueId,
      q.QueueNumber,
      q.Position QueuePosition,
      q.Status QueueStatus,
      q.ExpectedStartAt,
      q.ExpectedEndAt
    FROM Appointments a
    JOIN Patients p ON p.Id=a.PatientId
    JOIN Doctors d ON d.Id=a.DoctorId
    JOIN Services s ON s.Id=a.ServiceId
    LEFT JOIN QueueEntries q ON q.AppointmentId=a.Id
    WHERE a.StartAt>=CONVERT(datetime2,@day) AND a.StartAt<DATEADD(DAY,1,CONVERT(datetime2,@day)) ${appointmentScope}
    ORDER BY a.StartAt;

    SELECT TOP 1
      q.Id QueueId,
      q.PatientId,
      q.QueueNumber,
      q.Position QueuePosition,
      q.Status QueueStatus,
      q.ExpectedStartAt,
      q.ExpectedEndAt,
      p.FullName PatientName,
      s.Name ServiceName,
      a.StartAt AppointmentTime
    FROM QueueEntries q
    JOIN Patients p ON p.Id=q.PatientId
    JOIN Services s ON s.Id=q.ServiceId
    JOIN Appointments a ON a.Id=q.AppointmentId
    WHERE COALESCE(q.QueueDate,CONVERT(date,a.StartAt))=@day
      AND q.Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')
      ${queueScope}
    ORDER BY CASE WHEN q.Status=N'in_consultation' THEN 0 ELSE 1 END, q.Position, a.StartAt;
  `, (request) => request
    .input('date', sql.Date, date)
    .input('doctorId', sql.Int, user?.doctorId || null));

  return {
    summary: result.recordsets[0][0],
    upcoming: result.recordsets[1],
    nextQueue: result.recordsets[2][0] || null
  };
};

module.exports = { today };
