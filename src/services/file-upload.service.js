const fs = require('node:fs/promises');
const path = require('node:path');
const { AppError } = require('../utils/errors');

const ALLOWED_FILE_TYPES = Object.freeze({
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
});

const sanitizeOriginalName = (value) => {
  const name = path.basename(String(value || 'document'))
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
  return name || 'document';
};

const isAllowedFile = (file) => {
  const extensions = ALLOWED_FILE_TYPES[file?.mimetype] || [];
  return extensions.includes(path.extname(String(file?.originalname || '')).toLowerCase());
};

const readSignature = async (filePath) => {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, result.bytesRead);
  } finally {
    await handle.close();
  }
};

const signatureMatches = (buffer, mimeType) => {
  if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  return false;
};

const validateUploadedFile = async (filePath, mimeType) => {
  let signature;
  try {
    signature = await readSignature(filePath);
  } catch (_) {
    throw new AppError('تعذر قراءة الملف المرفوع.', 400, 'INVALID_UPLOAD');
  }
  if (!signatureMatches(signature, mimeType)) {
    throw new AppError('محتوى الملف لا يطابق نوعه المعلن. اختاري ملفًا صالحًا ثم حاولي مرة أخرى.', 400, 'INVALID_FILE_SIGNATURE');
  }
};

module.exports = { ALLOWED_FILE_TYPES, isAllowedFile, sanitizeOriginalName, validateUploadedFile };
