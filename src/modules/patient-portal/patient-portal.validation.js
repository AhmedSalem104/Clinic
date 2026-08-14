const { z } = require('zod');

const optionalDate = z.string().date().optional().nullable().or(z.literal(''));

const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  dateOfBirth: optionalDate,
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
  alternatePhone: z.string().trim().max(40).optional().nullable().or(z.literal('')),
  preferredContactChannel: z.enum(['sms', 'whatsapp', 'phone']).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  emergencyContactName: z.string().max(160).optional().nullable(),
  emergencyContactPhone: z.string().max(40).optional().nullable(),
  consent: z.literal(true)
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
  }
});

module.exports = { registrationSchema };
