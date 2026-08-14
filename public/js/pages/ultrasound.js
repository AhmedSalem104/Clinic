import { medicalService } from '../services/medical-service.js';
import { clinicService } from '../services/clinic-service.js';
import { renderMedicalPage, input, formatDate, escapeHtml, emptyState } from './medical-common.js';

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'السونار',
    description: 'اختر نوع الفحص لتظهر قياسات الحمل أو الحوض النسائي المناسبة فقط.',
    formTitle: 'تسجيل فحص سونار',
    load: (id) => medicalService.ultrasounds(id),
    form: () => [
      input('نوع الفحص', 'studyType', 'select', { required: true, options: [['obstetric_standard', 'توليدي قياسي'], ['obstetric_detailed', 'توليدي تفصيلي'], ['gynecological_pelvic', 'حوض نسائي'], ['follow_up', 'متابعة'], ['other', 'آخر']] }),
      input('تاريخ الفحص', 'studyDate', 'date', { required: true }),
      input('طريقة الفحص', 'technique', 'select', { options: [['', 'غير محدد'], ['transabdominal', 'عبر البطن'], ['transvaginal', 'مهبلي'], ['both', 'الطريقتان'], ['other', 'أخرى']] }),
      input('الطبيب المنفذ', 'performedBy', 'select', { required: true, options: [['', 'اختر الطبيب']] }),
      input('دلالة الفحص', 'indication', 'textarea', { span2: true, max: 500 }),
      input('العمر الحملي - أسابيع', 'gestationalAgeWeeks', 'number', { min: 0, max: 45 }),
      input('العمر الحملي - أيام', 'gestationalAgeDays', 'number', { min: 0, max: 6 }),
      input('عدد الأجنة', 'fetalCount', 'number', { min: 1, max: 10 }),
      input('نبض الجنين', 'fetalHeartRateBpm', 'number', { min: 0, max: 250 }),
      input('CRL (mm)', 'crlMm', 'number', { step: '0.01', min: 0 }),
      input('BPD (mm)', 'bpdMm', 'number', { step: '0.01', min: 0 }),
      input('HC (mm)', 'hcMm', 'number', { step: '0.01', min: 0 }),
      input('AC (mm)', 'acMm', 'number', { step: '0.01', min: 0 }),
      input('FL (mm)', 'flMm', 'number', { step: '0.01', min: 0 }),
      input('الوزن التقديري (g)', 'estimatedFetalWeightGrams', 'number', { min: 0 }),
      input('المشيمة', 'placenta'),
      input('السائل الأمنيوسي', 'amnioticFluid'),
      input('طول عنق الرحم (mm)', 'cervixLengthMm', 'number', { step: '0.01', min: 0 }),
      input('أبعاد الرحم', 'uterusDimensions'),
      input('سمك بطانة الرحم (mm)', 'endometriumThicknessMm', 'number', { step: '0.01', min: 0 }),
      input('أبعاد المبيض الأيمن', 'rightOvaryDimensions'),
      input('أبعاد المبيض الأيسر', 'leftOvaryDimensions'),
      input('نتائج الملحقات', 'adnexaFindings', 'textarea', { span2: true, max: 2000 }),
      input('Findings', 'findings', 'textarea', { span2: true, max: 4000 }),
      input('Impression', 'impression', 'textarea', { span2: true, max: 3000 })
    ],
    afterForm: async (wrapper) => {
      const doctors = await clinicService.doctors({ page: 1, pageSize: 100 });
      wrapper.querySelector('[name="performedBy"]').innerHTML = `<option value="">اختر الطبيب</option>${(doctors.data || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}`;
    },
    serialize: (data) => {
      const output = { ...data, performedBy: data.performedBy ? Number(data.performedBy) : null };
      for (const key of ['gestationalAgeWeeks', 'gestationalAgeDays', 'fetalCount', 'fetalHeartRateBpm', 'estimatedFetalWeightGrams', 'crlMm', 'bpdMm', 'hcMm', 'acMm', 'flMm', 'cervixLengthMm', 'endometriumThicknessMm']) output[key] = data[key] === '' ? null : Number(data[key]);
      return output;
    },
    submit: (data) => medicalService.createUltrasound(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>التقنية</th><th>العمر الحملي</th><th>النبض</th><th>الانطباع</th></tr></thead><tbody>${rows.map((ultrasound) => `<tr><td>${formatDate(ultrasound.StudyDate)}</td><td class="font-semibold">${escapeHtml(ultrasound.StudyType)}</td><td>${escapeHtml(ultrasound.Technique || '—')}</td><td>${ultrasound.GestationalAgeWeeks != null ? `${ultrasound.GestationalAgeWeeks}+${ultrasound.GestationalAgeDays || 0}` : '—'}</td><td>${ultrasound.FetalHeartRateBpm || '—'}</td><td>${escapeHtml(ultrasound.Impression || '—')}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد فحوصات سونار مسجلة.')
  });
}
