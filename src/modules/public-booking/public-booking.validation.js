const { z } = require('zod');

const optionalDate = z.string().date().optional().nullable().or(z.literal(''));

const bookingSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  phone: z.string().trim().min(5).max(40),
  dateOfBirth: optionalDate,
  preferredContactChannel: z.enum(['sms', 'whatsapp', 'phone']).optional().nullable().or(z.literal('')),
  doctorId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  startAt: z.string().datetime({ offset: true }),
  consent: z.literal(true)
});

const optionsQuerySchema = z.object({});

const slotsQuerySchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.string().date()
});

module.exports = { bookingSchema, optionsQuerySchema, slotsQuerySchema };
