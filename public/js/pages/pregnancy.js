import { medicalService } from '../services/medical-service.js';
import { renderMedicalPage, input, formatDate, statusBadge, escapeHtml, emptyState } from './medical-common.js';
import { localDateKey } from '../core/ui.js';

const toNullableNumber = (value) => value === '' || value == null ? null : Number(value);
const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'سجلات الحمل',
    description: 'يُحفظ كل حمل كحالة مستقلة تشمل تاريخ آخر دورة والموعد المتوقع للولادة والتاريخ الولادي والنتيجة.',
    formTitle: 'إضافة حمل',
    load: (id) => medicalService.pregnancies(id),
    form: () => [
      input('تاريخ آخر دورة (LMP)', 'lmp', 'date'),
      input('الموعد المتوقع للولادة (EDD)', 'edd', 'date'),
      input('طريقة حساب الموعد المتوقع', 'eddMethod', 'select', { options: [['', 'غير محدد'], ['lmp', 'الحساب من آخر دورة'], ['early_ultrasound', 'سونار مبكر'], ['other_clinician_assessment', 'تقييم الطبيب']] }),
      input('رقم الحمل', 'pregnancyNumber', 'number', { min: 1, max: 30 }),
      input('عدد مرات الحمل (Gravida)', 'gravida', 'number', { min: 0, max: 30 }),
      input('عدد الولادات (Para)', 'para', 'number', { min: 0, max: 30 }),
      input('الإجهاض أو فقد الحمل', 'abortions', 'number', { min: 0, max: 30 }),
      input('عدد الأطفال الأحياء', 'livingChildren', 'number', { min: 0, max: 30 }),
      input('عدد الأجنة', 'fetalCount', 'number', { min: 1, max: 10 }),
      input('عوامل الخطورة — عامل واحد في كل سطر', 'riskFactors', 'textarea', { span2: true, max: 1500 })
    ],
    afterForm: (wrapper) => {
      const lmp = wrapper.querySelector('[name="lmp"]');
      const edd = wrapper.querySelector('[name="edd"]');
      const method = wrapper.querySelector('[name="eddMethod"]');
      const refreshEdd = () => {
        const calculated = method.value === 'lmp' && lmp.value ? addDays(lmp.value, 280) : '';
        if (calculated) edd.value = calculated;
        edd.readOnly = method.value === 'lmp';
      };
      lmp.addEventListener('input', refreshEdd);
      method.addEventListener('change', refreshEdd);
      refreshEdd();
    },
    serialize: (data) => ({
      ...data,
      pregnancyNumber: toNullableNumber(data.pregnancyNumber),
      gravida: toNullableNumber(data.gravida),
      para: toNullableNumber(data.para),
      abortions: toNullableNumber(data.abortions),
      livingChildren: toNullableNumber(data.livingChildren),
      fetalCount: toNullableNumber(data.fetalCount),
      riskFactors: data.riskFactors ? data.riskFactors.split('\n').map((item) => item.trim()).filter(Boolean) : []
    }),
    submit: (data) => medicalService.createPregnancy(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>الحمل</th><th>آخر دورة</th><th>الموعد المتوقع</th><th>طريقة الحساب</th><th>الطبيب</th><th>الحالة</th></tr></thead><tbody>${rows.map((pregnancy) => `<tr><td>${escapeHtml(pregnancy.PregnancyNumber || '—')}</td><td>${formatDate(pregnancy.LMP)}</td><td>${formatDate(pregnancy.EDD)}</td><td>${escapeHtml(pregnancy.EDDMethod || '—')}</td><td>${escapeHtml(pregnancy.AssignedDoctor || '—')}</td><td>${statusBadge(pregnancy.Status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد سجلات حمل.')
  });
}
