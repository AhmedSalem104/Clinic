const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200)
});

module.exports = { loginSchema };
