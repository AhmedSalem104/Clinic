const { query } = require('../../db/repository');
const { sql } = require('../../db/connection');

const queueByToken = async (token) => {
  const result = await query(`
    SELECT TOP 1 q.QueueNumber,q.Status,q.Position,q.ExpectedStartAt,q.ExpectedEndAt,
      a.StartAt AppointmentTime,d.FullName DoctorName,s.Name ServiceName,
      (SELECT COUNT(1) FROM QueueEntries ahead
       WHERE ahead.DoctorId=q.DoctorId AND ahead.QueueDate=q.QueueDate AND ahead.Position<q.Position
         AND ahead.Status IN (N'booked',N'confirmed',N'arrived',N'waiting',N'late',N'in_consultation')) PeopleAhead
    FROM Appointments a
    JOIN QueueEntries q ON q.AppointmentId=a.Id
    JOIN Doctors d ON d.Id=a.DoctorId
    JOIN Services s ON s.Id=a.ServiceId
    WHERE a.PublicTrackingToken=@token;
  `, (request) => request.input('token', sql.NVarChar(64), token));
  return result.recordset[0] || null;
};

module.exports = { queueByToken };
