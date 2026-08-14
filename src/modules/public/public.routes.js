const express = require('express');
const controller = require('./public.controller');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();
router.get('/queue/:token', asyncHandler(controller.queue));

module.exports = { router };
