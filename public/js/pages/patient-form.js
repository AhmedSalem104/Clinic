import { patientService } from '../services/patient-service.js';
import { ApiError } from '../core/api-service.js';
import { escapeHtml, icon, loadingButton, toast } from '../core/ui.js';

export async function render(outlet) {
  const query = new URLSearchParams(window.location.search);
  const editId = Number(query.get('patientId') || 0);
  let existing = null;
  if (editId) existing = await patientService.get(editId);
  const value = (name) => escapeHtml(existing?.[name] ?? '');
  const isEdit = Boolean(existing);
  outlet.innerHTML = `<div class="section-heading"><div><h1>${isEdit ? 'استكمال بيانات المريضة' : 'إضافة مريضة'}</h1><p>${isEdit ? 'استكملي البيانات التشغيلية التي جمعها الريسبشن عند الوصول، ثم علّمي الملف كمكتمل.' : 'البيانات التشغيلية الأساسية فقط. التاريخ الطبي يضاف من داخل السجل الطبي بواسطة الطبيب.'}</p></div><a class="btn btn-secondary" href="${isEdit ? `/patients/${editId}` : '/patients'}" data-route="${isEdit ? `/patients/${editId}` : '/patients'}">${icon('arrow')} ${isEdit ? 'العودة للملف' : 'عودة للمرضى'}</a></div><form id="patient-form" class="card p-5"><div class="mb-5 border-b border-slate-100 pb-4"><h2 class="font-semibold text-slate-900">بيانات المريضة الأساسية</h2><p class="mt-1 text-xs text-slate-500">الاسم والهاتف يستخدمان في البحث واكتشاف التكرار. لا تضيفي التشخيص هنا.</p></div><div class="form-grid"><div><label class="form-label" for="fullName">الاسم الكامل <span class="text-red-500">*</span></label><input class="input" id="fullName" name="fullName" value="${value('FullName')}" required maxlength="180" /></div><div><label class="form-label" for="phone">رقم الهاتف <span class="text-red-500">*</span></label><input class="input" id="phone" name="phone" value="${value('Phone')}" inputmode="tel" required maxlength="40" /></div><div><label class="form-label" for="dateOfBirth">تاريخ الميلاد</label><input class="input" id="dateOfBirth" name="dateOfBirth" value="${value('DateOfBirth')?.slice(0, 10)}" type="date" /></div><div><label class="form-label" for="alternatePhone">هاتف بديل</label><input class="input" id="alternatePhone" name="alternatePhone" value="${value('AlternatePhone')}" inputmode="tel" maxlength="40" /></div><div><label class="form-label" for="preferredContactChannel">وسيلة التواصل المفضلة</label><select class="select" id="preferredContactChannel" name="preferredContactChannel"><option value="">غير محدد</option><option value="whatsapp" ${existing?.PreferredContactChannel === 'whatsapp' ? 'selected' : ''}>WhatsApp</option><option value="sms" ${existing?.PreferredContactChannel === 'sms' ? 'selected' : ''}>SMS</option><option value="phone" ${existing?.PreferredContactChannel === 'phone' ? 'selected' : ''}>هاتف</option></select></div><div><label class="form-label" for="profileStatus">اكتمال الملف</label><select class="select" id="profileStatus" name="profileStatus"><option value="incomplete" ${existing?.ProfileStatus === 'incomplete' ? 'selected' : ''}>بيانات ناقصة</option><option value="complete" ${existing?.ProfileStatus !== 'incomplete' ? 'selected' : ''}>مكتمل</option></select></div><div><label class="form-label" for="emergencyContactName">اسم جهة اتصال للطوارئ</label><input class="input" id="emergencyContactName" name="emergencyContactName" value="${value('EmergencyContactName')}" maxlength="160" /></div><div><label class="form-label" for="emergencyContactPhone">هاتف جهة الاتصال</label><input class="input" id="emergencyContactPhone" name="emergencyContactPhone" value="${value('EmergencyContactPhone')}" inputmode="tel" maxlength="40" /></div><div class="span-2"><label class="form-label" for="address">العنوان</label><textarea class="textarea" id="address" name="address" rows="2" maxlength="500">${value('Address')}</textarea></div></div><div class="mt-6 flex justify-end gap-2"><a class="btn btn-secondary" href="${isEdit ? `/patients/${editId}` : '/patients'}" data-route="${isEdit ? `/patients/${editId}` : '/patients'}">إلغاء</a><button class="btn btn-primary" type="submit">${isEdit ? 'حفظ واستكمال الملف' : 'حفظ المريضة'}</button></div></form>`;
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  document.querySelector('#patient-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type=submit]');
    const data = Object.fromEntries(new FormData(form).entries());
    loadingButton(button, true);
    try {
      const patient = isEdit ? await patientService.update(editId, data) : await patientService.create(data);
      toast(isEdit ? 'تم تحديث ملف المريضة' : 'تم إنشاء سجل المريضة');
      window.clinicApp.navigate(`/patients/${patient.Id}`);
    } catch (error) {
      if (!isEdit && error instanceof ApiError && error.code === 'POTENTIAL_DUPLICATE') {
        const matches = (error.details?.matches || []).map((row) => `<div class="text-right border-b border-slate-100 py-2"><strong>${escapeHtml(row.FullName)}</strong><div class="text-xs text-slate-500">${escapeHtml(row.PatientCode)} · ${escapeHtml(row.Phone)}</div></div>`).join('');
        const result = await window.Swal.fire({ title: 'سجل مشابه محتمل', html: `<p class="mb-2 text-sm text-slate-500">راجعي السجلات قبل إنشاء سجل جديد.</p>${matches}`, showCancelButton: true, confirmButtonText: 'إنشاء رغم ذلك', cancelButtonText: 'إلغاء', reverseButtons: true, confirmButtonColor: '#2563eb' });
        if (result.isConfirmed) {
          try { const patient = await patientService.create({ ...data, confirmDuplicate: true }); toast('تم إنشاء سجل المريضة'); window.clinicApp.navigate(`/patients/${patient.Id}`); }
          catch (retryError) { window.Swal.fire({ icon: 'error', title: 'تعذر الحفظ', text: retryError.message }); }
        }
      } else window.Swal.fire({ icon: 'error', title: 'تعذر الحفظ', text: error.message || 'تحققي من البيانات.' });
    } finally { loadingButton(button, false); }
  });
}
