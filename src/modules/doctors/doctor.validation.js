const { z } = require('zod');
const doctorSchema = z.object({ fullName:z.string().trim().min(2).max(160), specialty:z.string().max(160).optional().nullable(), phone:z.string().max(40).optional().nullable(), email:z.string().email().max(255).optional().nullable().or(z.literal('')), bio:z.string().max(1000).optional().nullable(), status:z.enum(['active','inactive','unavailable']).optional() });
const servicesSchema = z.object({ serviceIds:z.array(z.coerce.number().int().positive()).max(100) });
module.exports={doctorSchema,servicesSchema};
