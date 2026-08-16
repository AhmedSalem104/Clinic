const fs = require('node:fs');
const { ok, created } = require('../../utils/response');
const service = require('../medical-records/medical.service');
const { AppError } = require('../../utils/errors');
const { resolveLocalPath } = require('../../services/storage.service');
const { sanitizeOriginalName, validateUploadedFile } = require('../../services/file-upload.service');

const list = async (req, res) => {
  const patientId = Number(req.query.patientId);
  if (!Number.isInteger(patientId) || patientId < 1) throw new AppError('معرّف المريضة غير صالح.', 400, 'INVALID_PATIENT_ID');
  await service.withAccess(patientId, req.user, async () => {});
  return ok(res, await service.listDocuments(patientId));
};

const upload = async (req, res) => {
  if (!req.file) throw new AppError('اختاري ملفًا صالحًا.', 400, 'FILE_REQUIRED');
  const patientId = Number(req.body.patientId);
  if (!Number.isInteger(patientId) || patientId < 1) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    throw new AppError('معرّف المريضة غير صالح.', 400, 'INVALID_PATIENT_ID');
  }

  try {
    await validateUploadedFile(req.file.path, req.file.mimetype);
    await service.withAccess(patientId, req.user, async () => {});
    const document = await service.createDocument({
      patientId,
      caseId: req.body.caseId ? Number(req.body.caseId) : null,
      visitId: req.body.visitId ? Number(req.body.visitId) : null,
      documentType: req.body.documentType || 'external_report',
      fileName: sanitizeOriginalName(req.file.originalname),
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      storagePath: req.file.path,
      documentDate: req.body.documentDate || null,
      uploadedBy: req.user.id
    });
    return created(res, {
      id: document.Id,
      fileName: document.FileName,
      mimeType: document.MimeType,
      fileSizeBytes: document.FileSizeBytes,
      createdAt: document.CreatedAt
    });
  } catch (error) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    throw error;
  }
};

const download = async (req, res) => {
  const document = await service.findDocument(Number(req.params.id));
  if (!document) throw new AppError('المستند غير موجود.', 404, 'DOCUMENT_NOT_FOUND');
  await service.withAccess(document.PatientId, req.user, async () => {});
  const absolute = resolveLocalPath(document.StoragePath);
  if (!fs.existsSync(absolute)) throw new AppError('الملف غير موجود في التخزين.', 404, 'FILE_NOT_FOUND');
  return res.download(absolute, sanitizeOriginalName(document.FileName));
};

module.exports = { list, upload, download };
