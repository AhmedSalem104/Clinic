const { ok } = require('../../utils/response');
const { AppError } = require('../../utils/errors');
const repository = require('./public.repository');

const queue = async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!/^[a-f0-9]{48}$/i.test(token)) throw new AppError('Queue tracking link is invalid.', 404, 'TRACKING_NOT_FOUND');
  const row = await repository.queueByToken(token);
  if (!row) throw new AppError('Queue tracking link is invalid or expired.', 404, 'TRACKING_NOT_FOUND');
  return ok(res, { queueNumber: row.QueueNumber, status: row.Status, peopleAhead: Math.max(0, Number(row.PeopleAhead || 0)), expectedStartAt: row.ExpectedStartAt, expectedEndAt: row.ExpectedEndAt, appointmentTime: row.AppointmentTime, doctorName: row.DoctorName, serviceName: row.ServiceName });
};

module.exports = { queue };
