const express = require('express');
const controller = require('./patient.controller');
const { patientSchema, assignmentSchema } = require('./patient.validation');
const { validate } = require('../../middleware/validate');
const { requireAuth, requirePermission, requireAnyPermission } = require('../../middleware/auth');
const { PERMISSIONS } = require('../../config/permissions');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();
router.use(requireAuth);
router.get('/', requireAnyPermission(PERMISSIONS.VIEW_ALL_PATIENTS, PERMISSIONS.VIEW_ASSIGNED_PATIENTS), asyncHandler(controller.list));
router.post('/', requirePermission(PERMISSIONS.MANAGE_PATIENTS), validate(patientSchema), asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.getById));
router.patch('/:id', requirePermission(PERMISSIONS.MANAGE_PATIENTS), validate(patientSchema), asyncHandler(controller.update));
router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_PATIENTS), asyncHandler(controller.remove));
router.get('/:id/assignments', asyncHandler(controller.assignments));
router.post('/:id/assignments', requirePermission(PERMISSIONS.MANAGE_PATIENTS), validate(assignmentSchema), asyncHandler(controller.assign));

module.exports = { router };
