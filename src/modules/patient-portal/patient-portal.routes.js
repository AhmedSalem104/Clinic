const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./patient-portal.controller');
const { registrationSchema } = require('./patient-portal.validation');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireRoles } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();

router.post('/register', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), validate(registrationSchema), asyncHandler(controller.register));
router.use(requireAuth, requireRoles('patient'));
router.get('/summary', asyncHandler(controller.summary));

module.exports = { router };
