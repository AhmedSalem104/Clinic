const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');

const queueByToken = async (token) => {
  const result = await query(`
    SELECT TOP 1 q.QueueNumber,q.Status,q.Position,q.ExpectedStartAt,q.ExpectedEndAt,
      a.StartAt AppointmentTime,d.FullName DoctorName,s.Name ServiceName,
      nowServing.CurrentQueueNumber,nowServing.CurrentQueueStatus,
      (SELECT COUNT(1) FROM QueueEntries ahead
       WHERE ahead.DoctorId=q.DoctorId AND ahead.QueueDate=q.QueueDate AND ahead.Position<q.Position
         AND ahead.Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')) PeopleAhead
    FROM Appointments a
    JOIN QueueEntries q ON q.AppointmentId=a.Id
    JOIN Doctors d ON d.Id=a.DoctorId
    JOIN Services s ON s.Id=a.ServiceId
    OUTER APPLY (
      SELECT TOP 1 currentQueue.QueueNumber CurrentQueueNumber,currentQueue.Status CurrentQueueStatus
      FROM QueueEntries currentQueue
      JOIN Appointments currentAppointment ON currentAppointment.Id=currentQueue.AppointmentId
      WHERE currentQueue.DoctorId=q.DoctorId
        AND COALESCE(currentQueue.QueueDate,CONVERT(date,currentAppointment.StartAt))=COALESCE(q.QueueDate,CONVERT(date,a.StartAt))
        AND currentQueue.Status IN (N'arrived',N'waiting',N'late',N'in_consultation')
      ORDER BY CASE
        WHEN currentQueue.Status=N'in_consultation' THEN 0
        WHEN currentQueue.Status IN (N'arrived',N'waiting',N'late') THEN 1
        ELSE 2
      END,currentQueue.Position,currentQueue.CreatedAt
    ) nowServing
    WHERE a.PublicTrackingToken=@token;
  `, (request) => request.input('token', sql.NVarChar(64), token));
  return result.recordset[0] || null;
};

module.exports = { queueByToken };
