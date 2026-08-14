import { medicalService } from '../services/medical-service.js';
import { clinicService } from '../services/clinic-service.js';
import { renderMedicalPage, input, formatDateTime, statusBadge, escapeHtml, emptyState } from './medical-common.js';

const pregnancyFields = () => `<div id="pregnancy-visit-fields" class="span-2 hidden rounded-lg border border-blue-100 bg-blue-50 p-4"><div class="mb-3 text-xs font-semibold text-blue-900">حقول متابعة الحمل</div><div class="form-grid"><div><label class="form-label">الحمل المرتبط *</label><select class="select" name="pregnancyId"><option value="">اختر الحمل</option></select></div>${input('ارتفاع قاع الرحم (cm)', 'fundalHeightCm', 'number', { step: '0.01', min: 0, max: 100 })}${input('نبض الجنين (bpm)', 'fetalHeartRateBpm', 'number', { min: 0, max: 250 })}${input('حركة الجنين', 'fetalMovementConcern', 'select', { options: [['no_concern', 'لا يوجد قلق'], ['concern_reported', 'يوجد قلق مُبلغ عنه'], ['not_assessed', 'لم تُقيّم']] })}${input('بروتين البول', 'urineProtein', 'select', { options: [['not_done', 'لم يُفحص'], ['negative', 'سلبي'], ['trace', 'Trace'], ['+', '+'], ['++', '++'], ['+++', '+++']] })}${input('الوذمة', 'edema', 'select', { options: [['not_assessed', 'لم تُقيّم'], ['none', 'لا توجد'], ['mild', 'خفيفة'], ['moderate', 'متوسطة'], ['severe', 'شديدة']] })}${input('وضعية الجنين', 'presentation', 'text', { placeholder: 'عند انطباقها' })}${input('نتيجة تقييم الخطورة', 'riskAssessmentOutcome', 'select', { options: [['routine', 'روتيني'], ['needs_review', 'يحتاج مراجعة'], ['refer', 'إحالة']] })}</div></div>`;

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'الزيارات الطبية',
    description: 'Encounter فعلي منفصل عن Appointment، بنموذج سريع يختلف حسب نوع الزيارة.',
    formTitle: 'بدء زيارة',
    load: (id) => medicalService.visits({ patientId: id, page: 1, pageSize: 50 }).then((response) => response.data || []),
    form: () => [
      input('نوع الزيارة', 'visitType', 'select', { required: true, options: [['first_visit', 'أول زيارة'], ['follow_up', 'متابعة'], ['gynecology', 'استشارة نساء'], ['pregnancy_follow_up', 'متابعة حمل'], ['ultrasound', 'زيارة سونار'], ['procedure', 'إجراء']] }),
      input('الطبيب المعالج', 'doctorId', 'select', { required: true, options: [['', 'اختر الطبيب']] }),
      input('الشكوى الرئيسية', 'chiefComplaint', 'textarea', { span2: true, max: 2000 }),
      input('الأعراض ذات الصلة', 'symptoms', 'textarea', { span2: true, max: 3000 }),
      input('الفحص', 'examination', 'textarea', { span2: true, max: 3000 }),
      input('التقييم', 'assessment', 'textarea', { span2: true, max: 3000 }),
      input('التشخيص', 'diagnosis', 'textarea', { span2: true, max: 3000 }),
      input('خطة العلاج', 'treatmentPlan', 'textarea', { span2: true, max: 3000 }),
      input('ملاحظات الطبيب', 'doctorNotes', 'textarea', { span2: true, max: 5000 }),
      input('خطة المتابعة', 'followUpPlan', 'textarea', { span2: true, max: 2000 }),
      input('الموعد المقترح التالي', 'nextVisitDate', 'date'),
      input('الوزن (kg)', 'weightKg', 'number', { step: '0.01', min: 0, max: 500 }),
      input('الضغط الانقباضي', 'systolicBp', 'number', { min: 0, max: 300 }),
      input('الضغط الانبساطي', 'diastolicBp', 'number', { min: 0, max: 200 }),
      input('درجة الألم 0–10', 'painScore', 'number', { min: 0, max: 10 }),
      pregnancyFields()
    ],
    afterForm: async (wrapper, patient) => {
      const doctors = await clinicService.doctors({ page: 1, pageSize: 100 });
      const doctorSelect = wrapper.querySelector('[name="doctorId"]');
      doctorSelect.innerHTML = `<option value="">اختر الطبيب</option>${(doctors.data || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}`;
      const pregnancies = await medicalService.pregnancies(patient.Id);
      const pregnancySelect = wrapper.querySelector('[name="pregnancyId"]');
      pregnancySelect.innerHTML = `<option value="">اختر الحمل</option>${(pregnancies || []).filter((pregnancy) => pregnancy.Status === 'active').map((pregnancy) => `<option value="${pregnancy.Id}">EDD ${pregnancy.EDD || 'غير محدد'} · ${pregnancy.EDDMethod || ''}</option>`).join('')}`;
      const visitType = wrapper.querySelector('[name="visitType"]');
      const pregnancySection = wrapper.querySelector('#pregnancy-visit-fields');
      const refresh = () => pregnancySection.classList.toggle('hidden', visitType.value !== 'pregnancy_follow_up');
      visitType.addEventListener('change', refresh);
      refresh();
    },
    serialize: (data) => {
      const output = { ...data };
      for (const key of ['doctorId', 'weightKg', 'systolicBp', 'diastolicBp', 'painScore']) output[key] = data[key] === '' ? null : Number(data[key]);
      if (data.visitType === 'pregnancy_follow_up') {
        output.pregnancyVisit = { pregnancyId: Number(data.pregnancyId), fundalHeightCm: data.fundalHeightCm === '' ? null : Number(data.fundalHeightCm), fetalHeartRateBpm: data.fetalHeartRateBpm === '' ? null : Number(data.fetalHeartRateBpm), fetalMovementConcern: data.fetalMovementConcern, urineProtein: data.urineProtein, edema: data.edema, presentation: data.presentation || null, riskAssessmentOutcome: data.riskAssessmentOutcome };
      }
      for (const key of ['pregnancyId', 'fundalHeightCm', 'fetalHeartRateBpm', 'fetalMovementConcern', 'urineProtein', 'edema', 'presentation', 'riskAssessmentOutcome']) delete output[key];
      return output;
    },
    submit: (data) => medicalService.createVisit({ ...data, status: 'draft' }),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>الطبيب</th><th>التقييم</th><th>الحالة</th></tr></thead><tbody>${rows.map((visit) => `<tr><td>${formatDateTime(visit.CreatedAt)}</td><td>${escapeHtml(visit.VisitType)}</td><td>${escapeHtml(visit.DoctorName)}</td><td>${escapeHtml(visit.Assessment || '—')}</td><td>${statusBadge(visit.Status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('لا توجد زيارات مسجلة.')
  });
}
