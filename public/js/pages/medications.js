import { medicalService } from '../services/medical-service.js';
import { clinicService } from '../services/clinic-service.js';
import { renderMedicalPage, input, formatDate, statusBadge, escapeHtml, emptyState } from './medical-common.js';

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'الأدوية', description: 'تسجيل الدواء والجرعة والطريق والتكرار والمدة والاستطباب مع حفظ التاريخ.', formTitle: 'إضافة دواء',
    load: (id) => medicalService.medication(id),
    form: () => [input('اسم الدواء', 'drugName', 'text', { required: true }), input('الاسم العلمي', 'genericName'), input('الجرعة', 'dose', 'text', { required: true }), input('وحدة الجرعة', 'doseUnit'), input('الطريق', 'route', 'select', { options: [['', 'غير محدد'], ['oral', 'فموي'], ['topical', 'موضعي'], ['vaginal', 'مهبلي'], ['intramuscular', 'عضلي'], ['intravenous', 'وريدي'], ['other', 'آخر']] }), input('التكرار', 'frequency', 'text', { required: true, placeholder: 'مثل مرة يوميًا' }), input('المدة', 'duration'), input('تاريخ البدء', 'startDate', 'date', { required: true }), input('تاريخ الانتهاء المخطط', 'plannedEndDate', 'date'), input('الطبيب الواصف', 'prescribedBy', 'select', { required: true, options: [['', 'اختر الطبيب']] }), input('الاستطباب', 'indication', 'textarea', { span2: true, max: 500 }), input('ملاحظات', 'notes', 'textarea', { span2: true, max: 1000 })],
    afterForm: async (wrapper) => { const doctors = await clinicService.doctors({ page: 1, pageSize: 100 }); wrapper.querySelector('[name="prescribedBy"]').innerHTML = `<option value="">اختر الطبيب</option>${(doctors.data || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}`; },
    serialize: (data) => ({ ...data, prescribedBy: data.prescribedBy ? Number(data.prescribedBy) : null }),
    submit: (data) => medicalService.createMedication(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>الدواء</th><th>الجرعة والطريق</th><th>التكرار</th><th>المدة</th><th>الاستطباب</th><th>البداية</th><th>الحالة</th></tr></thead><tbody>${rows.map((medication) => `<tr><td class="font-semibold">${escapeHtml(medication.DrugName)}<div class="text-[11px] text-slate-400">${escapeHtml(medication.GenericName || '')}</div></td><td>${escapeHtml(medication.Dose)} ${escapeHtml(medication.DoseUnit || '')} · ${escapeHtml(medication.Route || '—')}</td><td>${escapeHtml(medication.Frequency)}</td><td>${escapeHtml(medication.Duration || '—')}</td><td>${escapeHtml(medication.Indication || '—')}</td><td>${formatDate(medication.StartDate)}</td><td>${statusBadge(medication.Status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد أدوية مسجلة.')
  });
}
