const express = require('express');
const controller = require('./auth.controller');
const service = require('./auth.service');
const { loginSchema } = require('./auth.validation');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.get('/me', requireAuth, asyncHandler(controller.me));
router.post('/logout', asyncHandler(controller.logout));

module.exports = { router };
