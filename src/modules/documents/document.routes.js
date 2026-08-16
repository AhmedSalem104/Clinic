const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs');
const multer = require('multer');
const path = require('node:path');
const { env } = require('../../config/env');
const controller = require('./document.controller');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { PERMISSIONS } = require('../../config/permissions');
const { asyncHandler, AppError } = require('../../utils/errors');
const { assertDurableStorageAvailable } = require('../../services/storage.service');
const { ALLOWED_FILE_TYPES } = require('../../services/file-upload.service');

fs.mkdirSync(env.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, env.uploadDir),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extensions = ALLOWED_FILE_TYPES[file.mimetype] || [];
    if (!extensions.length || !extensions.includes(path.extname(file.originalname).toLowerCase())) {
      return callback(new AppError('نوع الملف غير مدعوم. المسموح PDF أو JPG أو PNG أو WEBP فقط.', 400, 'UNSUPPORTED_FILE_TYPE'));
    }
    return callback(null, true);
  }
});

const ensureUploadStorage = (_req, _res, next) => {
  try {
    assertDurableStorageAvailable();
    next();
  } catch (error) {
    next(error);
  }
};

const router = express.Router();
router.use(requireAuth, requirePermission(PERMISSIONS.VIEW_MEDICAL));
router.get('/', asyncHandler(controller.list));
router.get('/:id/download', asyncHandler(controller.download));
router.post('/', requirePermission(PERMISSIONS.WRITE_MEDICAL), ensureUploadStorage, upload.single('file'), asyncHandler(controller.upload));

module.exports = { router };
