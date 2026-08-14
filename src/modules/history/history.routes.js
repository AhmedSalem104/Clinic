const express = require('express');
const controller = require('./history.controller');
const { gyneHistorySchema, obstetricHistorySchema } = require('../medical-records/medical.validation');
const { validate } = require('../../middleware/validate');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { PERMISSIONS } = require('../../config/permissions');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();
router.use(requireAuth, requirePermission(PERMISSIONS.VIEW_MEDICAL));
router.get('/gynecologic', asyncHandler(controller.gyne));
router.put('/gynecologic', requirePermission(PERMISSIONS.WRITE_MEDICAL), validate(gyneHistorySchema), asyncHandler(controller.saveGyne));
router.get('/obstetric', asyncHandler(controller.obstetric));
router.post('/obstetric', requirePermission(PERMISSIONS.WRITE_MEDICAL), validate(obstetricHistorySchema), asyncHandler(controller.createObstetric));

module.exports = { router };
