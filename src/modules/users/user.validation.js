const { z } = require('zod');

const identityFields = {
  fullName: z.string().trim().min(2).max(160),
  email: z.string().email().max(255),
  role: z.enum(['owner', 'doctor', 'reception', 'patient']),
  doctorId: z.coerce.number().int().positive().optional().nullable(),
  patientId: z.coerce.number().int().positive().optional().nullable()
};

const withLinkRules = (schema) => schema.superRefine((value, context) => {
  if (value.role === 'patient' && !value.patientId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['patientId'], message: 'Patient users must be linked to a patient record.' });
  }
  if (value.role !== 'patient' && value.patientId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['patientId'], message: 'Only patient users can be linked to a patient record.' });
  }
});

const userSchema = withLinkRules(z.object({ ...identityFields, password: z.string().min(8).max(200) }));
const userUpdateSchema = withLinkRules(z.object({ ...identityFields, password: z.string().min(8).max(200).optional().or(z.literal('')) }));
const statusSchema = z.object({ isActive: z.boolean() });

module.exports = { userSchema, userUpdateSchema, statusSchema };
