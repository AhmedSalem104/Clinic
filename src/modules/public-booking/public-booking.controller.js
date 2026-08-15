const { ok, created } = require('../../utils/response');
const service = require('./public-booking.service');

const options = async (req, res) => ok(res, await service.listOptions(req.query.doctorId ? Number(req.query.doctorId) : null));
const slots = async (req, res) => ok(res, await service.publicSlots({
  doctorId: Number(req.query.doctorId),
  serviceId: Number(req.query.serviceId),
  date: req.query.date
}));
const create = async (req, res) => created(res, await service.createBooking(req.body, req));

module.exports = { options, slots, create };
