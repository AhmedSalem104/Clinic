import { medicalService } from '../services/medical-service.js';
import { renderMedicalPage, input, formatDate, escapeHtml, emptyState } from './medical-common.js';

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'Documents',
    description: 'Upload PDF and image reports as metadata-linked files, not Base64 in SQL Server.',
    formTitle: 'Upload document',
    load: (id) => medicalService.documents(id),
    form: () => [
      input('Document type', 'documentType', 'select', { required: true, options: [['lab_report', 'Lab report'], ['ultrasound_report', 'Ultrasound report'], ['hospital_report', 'Hospital report'], ['external_report', 'External report'], ['other', 'Other']] }),
      input('Document date', 'documentDate', 'date'),
      input('File', 'file', 'file', { required: true })
    ],
    serialize: (data) => data,
    submit: (data) => {
      const formData = new FormData();
      formData.append('patientId', String(data.patientId));
      formData.append('documentType', data.documentType);
      if (data.documentDate) formData.append('documentDate', data.documentDate);
      formData.append('file', data.file);
      return medicalService.uploadDocument(formData);
    },
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Type</th><th>File</th><th>Date</th><th>Size</th><th>Uploaded by</th></tr></thead><tbody>${rows.map((document) => `<tr><td>${escapeHtml(document.DocumentType)}</td><td><a class="page-link" href="/api/documents/${document.Id}/download" target="_blank">${escapeHtml(document.FileName)}</a></td><td>${formatDate(document.DocumentDate)}</td><td>${Math.round(Number(document.FileSizeBytes) / 1024)} KB</td><td>${escapeHtml(document.UploadedByName)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No documents uploaded.')
  });
}
