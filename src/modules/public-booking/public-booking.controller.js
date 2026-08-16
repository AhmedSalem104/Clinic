const { ok, created } = require('../../utils/response');
const service = require('./public-booking.service');
const { reverseGeocode } = require('../../services/location.service');
const { AppError } = require('../../utils/errors');

const options = async (req, res) => {
  res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
  return ok(res, await service.listOptions(req.query.doctorId ? Number(req.query.doctorId) : null));
};
const slots = async (req, res) => ok(res, await service.publicSlots({
  doctorId: Number(req.query.doctorId),
  serviceId: Number(req.query.serviceId),
  date: req.query.date
}));
const geocode = async (req, res) => {
  const result = await reverseGeocode({
    latitude: Number(req.query.locationLatitude),
    longitude: Number(req.query.locationLongitude)
  });
  if (!result?.displayName) throw new AppError('تعذر تحويل الموقع إلى عنوان. يمكنك كتابة العنوان يدويًا.', 422, 'ADDRESS_NOT_FOUND');
  return ok(res, { address: result.displayName, details: result.details || null });
};
const create = async (req, res) => created(res, await service.createBooking(req.body, req));

module.exports = { options, slots, geocode, create };
