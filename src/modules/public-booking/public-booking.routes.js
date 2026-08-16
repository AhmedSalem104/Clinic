const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./public-booking.controller');
const { bookingSchema, optionsQuerySchema, slotsQuerySchema, locationQuerySchema } = require('./public-booking.validation');
const { validate } = require('../../middleware/validate');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();
const publicReadLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const publicBookingLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });

router.get('/options', publicReadLimit, validate(optionsQuerySchema, 'query'), asyncHandler(controller.options));
router.get('/reverse-geocode', publicReadLimit, validate(locationQuerySchema, 'query'), asyncHandler(controller.geocode));
router.get('/available-slots', publicReadLimit, validate(slotsQuerySchema, 'query'), asyncHandler(controller.slots));
router.post('/', publicBookingLimit, validate(bookingSchema), asyncHandler(controller.create));

module.exports = { router };
