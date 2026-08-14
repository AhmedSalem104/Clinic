const { z } = require('zod');

const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  dateOfBirth: z.string().date().optional().nullable().or(z.literal('')),
  phone: z.string().trim().min(5).max(40),
  alternatePhone: z.string().trim().max(40).optional().nullable().or(z.literal('')),
  preferredContactChannel: z.enum(['sms', 'whatsapp', 'phone']).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  emergencyContactName: z.string().max(160).optional().nullable(),
  emergencyContactPhone: z.string().max(40).optional().nullable(),
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
