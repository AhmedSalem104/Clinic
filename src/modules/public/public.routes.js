const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./public.controller');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();
const publicQueueLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
router.get('/queue/:token', publicQueueLimit, asyncHandler(controller.queue));

module.exports = { router };
