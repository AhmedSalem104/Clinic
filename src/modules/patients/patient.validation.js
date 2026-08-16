const { z } = require('zod');

const optionalNumber = (schema) => z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}, schema.optional().nullable());

const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  dateOfBirth: z.string().date().optional().nullable().or(z.literal('')),
  phone: z.string().trim().min(5).max(40),
  alternatePhone: z.string().trim().max(40).optional().nullable().or(z.literal('')),
  preferredContactChannel: z.enum(['sms', 'whatsapp', 'phone']).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  locationLatitude: optionalNumber(z.number().finite().min(-90).max(90)),
  locationLongitude: optionalNumber(z.number().finite().min(-180).max(180)),
  locationAccuracyMeters: optionalNumber(z.number().finite().min(0).max(100000)),
  locationCapturedAt: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('')),
  emergencyContactName: z.string().max(160).optional().nullable(),
  emergencyContactPhone: z.string().max(40).optional().nullable(),
  profileStatus: z.enum(['incomplete', 'complete']).optional(),
  confirmDuplicate: z.boolean().optional()
});

const assignmentSchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  assignmentType: z.enum(['primary', 'case']).default('primary'),
  caseId: z.coerce.number().int().positive().optional().nullable()
}).superRefine((value, context) => {
  if (value.assignmentType === 'case' && !value.caseId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['caseId'], message: 'Case assignment requires a case.' });
});

module.exports = { patientSchema, assignmentSchema };
