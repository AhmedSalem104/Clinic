import {medicalService} from '../services/medical-service.js';import {renderMedicalPage,input,formatDateTime,statusBadge,escapeHtml,emptyState} from './medical-common.js';
export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'تطور الحالة',
    description: 'مؤشرات منظمة للمقارنة والرسم. التصنيف لا يمثل تشخيصًا آليًا ويحتاج مراجعة الطبيب.',
    allowAdd: true,
    formTitle: 'إضافة مؤشر',
    load: (id) => medicalService.progress(id),
    form: () => [
      input('المؤشر', 'indicatorName', 'select', { required: true, options: [['weight', 'الوزن'], ['systolic_bp', 'الضغط الانقباضي'], ['diastolic_bp', 'الضغط الانبساطي'], ['pain_score', 'درجة الألم'], ['fundal_height', 'ارتفاع قاع الرحم'], ['fetal_heart_rate', 'نبض الجنين'], ['lab_value', 'قيمة تحليل']] }),
      input('القيمة الرقمية', 'valueNumeric', 'number', { step: '0.01' }),
      input('القيمة النصية', 'valueText'),
      input('الوحدة', 'unit'),
      input('وقت التسجيل', 'recordedAt', 'datetime-local'),
      input('الاتجاه بعد مراجعة الطبيب', 'trendStatus', 'select', { options: [['', 'غير مصنف'], ['improving', 'تحسن'], ['stable', 'مستقر'], ['worsening', 'يتدهور'], ['needs_review', 'يحتاج مراجعة']] }),
      input('تمت مراجعة الطبيب', 'doctorValidated', 'select', { options: [['false', 'لا'], ['true', 'نعم']] })
    ],
    serialize: (data) => ({ ...data, valueNumeric: data.valueNumeric === '' ? null : Number(data.valueNumeric), doctorValidated: data.doctorValidated === 'true', recordedAt: data.recordedAt ? new Date(data.recordedAt).toISOString() : undefined }),
    submit: (data) => medicalService.createProgress(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>المؤشر</th><th>القيمة</th><th>الوحدة</th><th>وقت التسجيل</th><th>الاتجاه</th><th>مراجعة</th></tr></thead><tbody>${rows.map((progress) => `<tr><td class="font-semibold">${escapeHtml(progress.IndicatorName)}</td><td>${escapeHtml(progress.ValueNumeric ?? progress.ValueText ?? '—')}</td><td>${escapeHtml(progress.Unit || '—')}</td><td>${formatDateTime(progress.RecordedAt)}</td><td>${statusBadge(progress.TrendStatus || 'neutral')}</td><td>${progress.DoctorValidated ? '✓' : '—'}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد مؤشرات مسجلة.')
  });
}
