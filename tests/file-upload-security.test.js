const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { isAllowedFile, sanitizeOriginalName, validateUploadedFile } = require('../src/services/file-upload.service');

test('document uploads require a supported MIME type and matching extension', () => {
  assert.equal(isAllowedFile({ mimetype: 'application/pdf', originalname: 'report.pdf' }), true);
  assert.equal(isAllowedFile({ mimetype: 'application/pdf', originalname: 'report.exe' }), false);
  assert.equal(isAllowedFile({ mimetype: 'image/jpeg', originalname: 'scan.jpg' }), true);
});

test('document names are reduced to safe download names', () => {
  assert.equal(sanitizeOriginalName('../../patient report?.pdf'), 'patient report_.pdf');
  assert.equal(sanitizeOriginalName(''), 'document');
});

test('document upload validation checks the file signature', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-upload-test-'));
  const filePath = path.join(directory, 'report.pdf');
  try {
    await fs.writeFile(filePath, Buffer.from('%PDF-1.7\ncontent'));
    await assert.doesNotReject(() => validateUploadedFile(filePath, 'application/pdf'));
    await assert.rejects(() => validateUploadedFile(filePath, 'image/png'), { code: 'INVALID_FILE_SIGNATURE' });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
