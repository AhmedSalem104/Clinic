import { medicalService } from '../services/medical-service.js';
import { renderMedicalPage, input, formatDate, statusBadge, escapeHtml, emptyState } from './medical-common.js';

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'Lab tests',
    description: 'Structured results with units, reference ranges and an abnormal flag for comparison and reporting.',
    formTitle: 'Record lab test',
    load: (id) => medicalService.labs(id),
    form: () => [
      input('Test name', 'testName', 'text', { required: true }),
      input('Code when available', 'code'),
      input('Requested date', 'requestedDate', 'date'),
      input('Collected date', 'collectedDate', 'date'),
      input('Result date', 'resultDate', 'date'),
      input('Numeric result', 'resultNumeric', 'number', { step: '0.000001' }),
      input('Text result', 'resultText', 'textarea', { max: 2000 }),
      input('Unit', 'unit'),
      input('Reference range', 'referenceRange'),
      input('Abnormal flag', 'abnormalFlag', 'select', { options: [['', 'Not interpreted'], ['normal', 'Normal'], ['high', 'High'], ['low', 'Low'], ['critical', 'Critical'], ['not_interpreted', 'Not interpreted']] }),
      input('Status', 'status', 'select', { options: [['ordered', 'Ordered'], ['collected', 'Collected'], ['resulted', 'Resulted'], ['cancelled', 'Cancelled']] }),
      input('Notes', 'notes', 'textarea', { span2: true, max: 1000 })
    ],
    serialize: (data) => ({ ...data, resultNumeric: data.resultNumeric === '' ? null : Number(data.resultNumeric), status: data.status || 'ordered' }),
    submit: (data) => medicalService.createLab(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Test</th><th>Result date</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th><th>Status</th></tr></thead><tbody>${rows.map((lab) => `<tr><td class="font-semibold">${escapeHtml(lab.TestName)}<div class="text-[11px] text-slate-400">${escapeHtml(lab.Code || '')}</div></td><td>${formatDate(lab.ResultDate || lab.RequestedDate)}</td><td>${escapeHtml(lab.ResultNumeric ?? lab.ResultText ?? '—')}</td><td>${escapeHtml(lab.Unit || '—')}</td><td>${escapeHtml(lab.ReferenceRange || '—')}</td><td>${statusBadge(lab.AbnormalFlag || 'neutral')}</td><td>${statusBadge(lab.Status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No lab tests recorded.')
  });
}
