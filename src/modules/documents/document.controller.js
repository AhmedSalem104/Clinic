const fs = require('node:fs');
const path = require('node:path');
const { ok, created } = require('../../utils/response');
const service = require('../medical-records/medical.service');
const { env } = require('../../config/env');
const { AppError } = require('../../utils/errors');

const list = async (req, res) => { const patientId=Number(req.query.patientId); await service.withAccess(patientId,req.user,async()=>{}); return ok(res,await service.listDocuments(patientId)); };
const upload = async (req, res) => {
  if (!req.file) throw new AppError('اختر ملفًا صالحًا.', 400, 'FILE_REQUIRED');
  const patientId=Number(req.body.patientId);
  await service.withAccess(patientId,req.user,async()=>{});
  try {
    const document=await service.createDocument({ patientId, caseId:req.body.caseId?Number(req.body.caseId):null, visitId:req.body.visitId?Number(req.body.visitId):null, documentType:req.body.documentType||'external_report', fileName:req.file.originalname, mimeType:req.file.mimetype, fileSizeBytes:req.file.size, storagePath:req.file.path, documentDate:req.body.documentDate||null, uploadedBy:req.user.id });
    return created(res,{id:document.Id,fileName:document.FileName,mimeType:document.MimeType,fileSizeBytes:document.FileSizeBytes,createdAt:document.CreatedAt});
  } catch(error) { try { fs.unlinkSync(req.file.path); } catch(_) {} throw error; }
};
const download = async (req,res) => { const document=await service.findDocument(Number(req.params.id)); if(!document) throw new AppError('المستند غير موجود.',404,'DOCUMENT_NOT_FOUND'); await service.withAccess(document.PatientId,req.user,async()=>{}); const absolute=path.resolve(document.StoragePath); if(!fs.existsSync(absolute)) throw new AppError('الملف غير موجود في التخزين.',404,'FILE_NOT_FOUND'); return res.download(absolute,document.FileName); };
module.exports={list,upload,download};
