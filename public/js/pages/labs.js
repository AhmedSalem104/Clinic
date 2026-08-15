import { medicalService } from '../services/medical-service.js';
import { renderMedicalPage, input, formatDate, statusBadge, escapeHtml, emptyState } from './medical-common.js';

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'التحاليل',
    description: 'نتائج منظمة بالوحدات والمدى المرجعي وعلامة الانحراف للمقارنة وإعداد التقارير.',
    formTitle: 'تسجيل تحليل',
    load: (id) => medicalService.labs(id),
    form: () => [
      input('اسم التحليل', 'testName', 'text', { required: true }),
      input('الكود عند توفره', 'code'),
      input('تاريخ الطلب', 'requestedDate', 'date'),
      input('تاريخ سحب العينة', 'collectedDate', 'date'),
      input('تاريخ ظهور النتيجة', 'resultDate', 'date'),
      input('النتيجة الرقمية', 'resultNumeric', 'number', { step: '0.000001' }),
      input('النتيجة النصية', 'resultText', 'textarea', { max: 2000 }),
      input('الوحدة', 'unit'),
      input('المدى المرجعي', 'referenceRange'),
      input('علامة الانحراف', 'abnormalFlag', 'select', { options: [['', 'لم تُفسر'], ['normal', 'طبيعية'], ['high', 'مرتفعة'], ['low', 'منخفضة'], ['critical', 'حرجة'], ['not_interpreted', 'لم تُفسر']] }),
      input('الحالة', 'status', 'select', { options: [['ordered', 'مطلوب'], ['collected', 'تم سحب العينة'], ['resulted', 'ظهرت النتيجة'], ['cancelled', 'ملغى']] }),
      input('ملاحظات', 'notes', 'textarea', { span2: true, max: 1000 })
    ],
    serialize: (data) => ({ ...data, resultNumeric: data.resultNumeric === '' ? null : Number(data.resultNumeric), status: data.status || 'ordered' }),
    submit: (data) => medicalService.createLab(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>التحليل</th><th>تاريخ النتيجة</th><th>النتيجة</th><th>الوحدة</th><th>المدى المرجعي</th><th>العلامة</th><th>الحالة</th></tr></thead><tbody>${rows.map((lab) => `<tr><td class="font-semibold">${escapeHtml(lab.TestName)}<div class="text-[11px] text-slate-400">${escapeHtml(lab.Code || '')}</div></td><td>${formatDate(lab.ResultDate || lab.RequestedDate)}</td><td>${escapeHtml(lab.ResultNumeric ?? lab.ResultText ?? '—')}</td><td>${escapeHtml(lab.Unit || '—')}</td><td>${escapeHtml(lab.ReferenceRange || '—')}</td><td>${statusBadge(lab.AbnormalFlag || 'neutral')}</td><td>${statusBadge(lab.Status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد تحاليل مسجلة.')
  });
}
