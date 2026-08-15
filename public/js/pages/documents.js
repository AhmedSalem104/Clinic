import { medicalService } from '../services/medical-service.js';
import { renderMedicalPage, input, formatDate, escapeHtml, emptyState } from './medical-common.js';

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'المستندات',
    description: 'رفع تقارير PDF والصور وربطها ببيانات المريضة دون تخزينها كنص Base64 داخل قاعدة البيانات.',
    formTitle: 'رفع مستند',
    load: (id) => medicalService.documents(id),
    form: () => [
      input('نوع المستند', 'documentType', 'select', { required: true, options: [['lab_report', 'تقرير تحاليل'], ['ultrasound_report', 'تقرير سونار'], ['hospital_report', 'تقرير مستشفى'], ['external_report', 'تقرير خارجي'], ['other', 'أخرى']] }),
      input('تاريخ المستند', 'documentDate', 'date'),
      input('الملف', 'file', 'file', { required: true })
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
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>النوع</th><th>الملف</th><th>التاريخ</th><th>الحجم</th><th>رُفع بواسطة</th></tr></thead><tbody>${rows.map((document) => `<tr><td>${escapeHtml(document.DocumentType)}</td><td><a class="page-link" href="/api/documents/${document.Id}/download" target="_blank">${escapeHtml(document.FileName)}</a></td><td>${formatDate(document.DocumentDate)}</td><td>${Math.round(Number(document.FileSizeBytes) / 1024)} كيلوبايت</td><td>${escapeHtml(document.UploadedByName)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد مستندات مرفوعة.')
  });
}
