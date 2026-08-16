const { z } = require('zod');

const optionalDate = z.string().date().optional().nullable().or(z.literal(''));
const optionalNumber = (schema) => z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}, schema.optional().nullable());

const bookingSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  phone: z.string().trim().min(5).max(40),
  dateOfBirth: optionalDate,
  address: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  locationLatitude: optionalNumber(z.number().finite().min(-90).max(90)),
  locationLongitude: optionalNumber(z.number().finite().min(-180).max(180)),
  locationAccuracyMeters: optionalNumber(z.number().finite().min(0).max(100000)),
  locationCapturedAt: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('')),
  preferredContactChannel: z.enum(['sms', 'whatsapp', 'phone']).optional().nullable().or(z.literal('')),
  doctorId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  startAt: z.string().datetime({ offset: true }),
  consent: z.literal(true)
});

const optionsQuerySchema = z.object({ doctorId: z.coerce.number().int().positive().optional() });

const slotsQuerySchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.string().date()
});

module.exports = { bookingSchema, optionsQuerySchema, slotsQuerySchema };
