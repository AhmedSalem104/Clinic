import { clinicService } from '../services/clinic-service.js';
import { escapeHtml, emptyState, statusBadge, icon, toast, loadingButton, debounce, confirm, archiveButton } from '../core/ui.js';

const formValue = (form, name) => form.elements[name]?.value || '';

export async function render(outlet) {
  const [initialDoctors, servicesResponse] = await Promise.all([
    clinicService.doctors({ page: 1, pageSize: 25 }),
    clinicService.services({ page: 1, pageSize: 100 })
  ]);
  const services = servicesResponse.data || [];
  let editingId = null;

  outlet.innerHTML = `<div class="section-heading"><div><h1>${icon('doctor')} الأطباء</h1><p>إدارة بيانات الأطباء، الخدمات المسموح بها، والحالة التشغيلية.</p></div><button id="add-doctor" class="btn btn-primary">${icon('plus')} إضافة طبيب</button></div>
    <section id="doctor-editor" class="card mb-5 hidden p-5"><div class="mb-5 flex items-center justify-between"><div><h2 id="doctor-editor-title" class="text-lg font-semibold">إضافة طبيب</h2><p class="mt-1 text-xs text-slate-500">تعديل بيانات التشغيل لا يغيّر السجل الطبي السابق.</p></div><button id="close-doctor-editor" class="btn btn-ghost" type="button" aria-label="إغلاق">${icon('close')}</button></div>
      <form id="doctor-form"><div class="form-grid"><div><label class="form-label" for="doctor-full-name">الاسم الكامل <span class="text-red-500">*</span></label><input id="doctor-full-name" class="input" name="fullName" maxlength="160" required></div><div><label class="form-label">التخصص</label><input class="input" name="specialty" maxlength="160"></div><div><label class="form-label">الهاتف</label><input class="input" name="phone" maxlength="40" inputmode="tel"></div><div><label class="form-label">البريد الإلكتروني</label><input class="input" name="email" type="email" maxlength="255"></div><div><label class="form-label">الحالة</label><select class="select" name="status"><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="unavailable">غير متاح مؤقتًا</option></select></div><div><label class="form-label">الخدمات</label><select class="select" name="serviceIds" multiple size="4">${services.map((service) => `<option value="${service.Id}">${escapeHtml(service.Name)}</option>`).join('')}</select><div class="mt-1 text-[11px] text-slate-400">استخدم Ctrl أو Command لاختيار أكثر من خدمة.</div></div><div class="span-2"><label class="form-label">نبذة تشغيلية</label><textarea class="textarea" name="bio" maxlength="1000" rows="3"></textarea></div></div><div class="mt-5 flex justify-end gap-2"><button id="cancel-doctor" class="btn btn-secondary" type="button">إلغاء</button><button class="btn btn-primary" type="submit">${icon('save')} حفظ الطبيب</button></div></form></section>
    <section class="card"><div class="filter-bar border-b border-slate-100 p-4"><div class="relative min-w-[260px] flex-1"><span class="pointer-events-none absolute right-3 top-3 text-slate-400">${icon('search')}</span><input id="doctor-search" class="input pr-10" placeholder="ابحث بالاسم أو التخصص" aria-label="بحث الأطباء"></div></div><div id="doctors-table" class="table-wrap p-1">${emptyState('جاري تحميل الأطباء...')}</div><div id="doctors-pagination" class="border-t border-slate-100 p-4 text-xs text-slate-500"></div></section>`;

  const editor = document.querySelector('#doctor-editor');
  const form = document.querySelector('#doctor-form');
  const table = document.querySelector('#doctors-table');
  const pagination = document.querySelector('#doctors-pagination');
  const search = document.querySelector('#doctor-search');
  const openEditor = (doctor = null) => {
    editingId = doctor?.Id || null;
    document.querySelector('#doctor-editor-title').textContent = editingId ? 'تعديل بيانات الطبيب' : 'إضافة طبيب';
    form.reset();
    form.elements.status.value = doctor?.Status || 'active';
    for (const field of ['fullName', 'specialty', 'phone', 'email', 'bio']) form.elements[field].value = doctor?.[field[0].toUpperCase() + field.slice(1)] || '';
    if (doctor?.services) {
      const selected = new Set(doctor.services.map((item) => String(item.Id)));
      [...form.elements.serviceIds.options].forEach((option) => { option.selected = selected.has(option.value); });
    }
    editor.classList.remove('hidden');
    form.elements.fullName.focus();
  };
  const closeEditor = () => { editingId = null; editor.classList.add('hidden'); form.reset(); };
  const load = async (page = 1) => {
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-2/3"></div></div>';
    try {
      const response = page === 1 && !search.value ? initialDoctors : await clinicService.doctors({ page, pageSize: 25, search: search.value.trim() });
      const rows = response.data || [];
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>الطبيب</th><th>التخصص</th><th>الهاتف</th><th>المرضى</th><th>الخدمات</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${rows.map((doctor) => `<tr><td class="font-semibold">${escapeHtml(doctor.FullName)}</td><td>${escapeHtml(doctor.Specialty || '—')}</td><td dir="ltr" class="text-right">${escapeHtml(doctor.Phone || '—')}</td><td>${doctor.AssignedPatients || 0}</td><td>${doctor.ServiceCount || 0}</td><td>${statusBadge(doctor.Status)}</td><td><div class="flex flex-wrap gap-1"><button class="btn btn-ghost text-xs" data-edit="${doctor.Id}">${icon('save')} تعديل</button><button class="btn btn-ghost text-xs" data-toggle="${doctor.Id}" data-next="${doctor.Status === 'active' ? 'inactive' : 'active'}">${doctor.Status === 'active' ? 'تعطيل' : 'تفعيل'}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('لا يوجد أطباء مطابقون للبحث.', '<button class="btn btn-primary" data-empty-add>إضافة أول طبيب</button>');
      const meta = response.meta || {};
      pagination.innerHTML = `<div class="flex items-center justify-between"><span>عرض ${rows.length} من ${meta.total || 0}</span><div class="flex gap-2"><button class="btn btn-secondary text-xs" data-page="${Math.max(1, (meta.page || page) - 1)}" ${page <= 1 ? 'disabled' : ''}>السابق</button><span class="self-center">صفحة ${meta.page || page} من ${meta.totalPages || 1}</span><button class="btn btn-secondary text-xs" data-page="${Math.min(meta.totalPages || 1, (meta.page || page) + 1)}" ${page >= (meta.totalPages || 1) ? 'disabled' : ''}>التالي</button></div></div>`;
      table.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', async () => { try { openEditor(await clinicService.doctor(button.dataset.edit)); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحميل الطبيب', text: error.message }); } }));
      table.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', async () => { if (!(await confirm(`${button.dataset.next === 'active' ? 'تفعيل' : 'تعطيل'} الطبيب؟`, 'سيتم الاحتفاظ بالبيانات والحجوزات السابقة.', button.dataset.next === 'active' ? 'تفعيل' : 'تعطيل'))) return; try { const doctor = await clinicService.doctor(button.dataset.toggle); await clinicService.updateDoctor(button.dataset.toggle, { fullName: doctor.FullName, specialty: doctor.Specialty, phone: doctor.Phone, email: doctor.Email, bio: doctor.Bio, status: button.dataset.next }); toast('تم تحديث حالة الطبيب'); await load(page); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحديث الحالة', text: error.message }); } }));
      table.querySelectorAll('[data-toggle][data-next="inactive"]').forEach((toggle) => toggle.parentElement.append(archiveButton('archiveDoctor', toggle.dataset.toggle, 'حذف')));
      table.querySelectorAll('[data-archive-doctor]').forEach((button) => button.addEventListener('click', async () => { if (!(await confirm('أرشفة الطبيب؟', 'سيتم إيقاف الطبيب مع الاحتفاظ بالمواعيد والسجل الطبي السابق.', 'حذف / أرشفة'))) return; try { await clinicService.deleteDoctor(button.dataset.archiveDoctor); toast('تمت أرشفة الطبيب'); await load(page); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر أرشفة الطبيب', text: error.message }); } }));
      table.querySelector('[data-empty-add]')?.addEventListener('click', () => openEditor());
      pagination.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => load(Number(button.dataset.page))));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  document.querySelector('#add-doctor').addEventListener('click', () => openEditor());
  document.querySelector('#close-doctor-editor').addEventListener('click', closeEditor);
  document.querySelector('#cancel-doctor').addEventListener('click', closeEditor);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    data.status = form.elements.status.value;
    const serviceIds = [...form.elements.serviceIds.selectedOptions].map((option) => Number(option.value));
    loadingButton(button, true);
    try {
      const doctor = editingId ? await clinicService.updateDoctor(editingId, data) : await clinicService.createDoctor(data);
      await clinicService.setDoctorServices(doctor.Id, serviceIds);
      toast(editingId ? 'تم تعديل بيانات الطبيب' : 'تمت إضافة الطبيب');
      closeEditor();
      await load(1);
    } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر حفظ الطبيب', text: error.message }); } finally { loadingButton(button, false); }
  });
  search.addEventListener('input', debounce(() => load(1), 350));
  await load(1);
}
