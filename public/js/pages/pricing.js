import { clinicService } from '../services/clinic-service.js';
import { escapeHtml, emptyState, statusBadge, formatDate, formatMoney, toast, icon, loadingButton, confirm, archiveButton } from '../core/ui.js';
import { localDateKey } from '../core/ui.js';

export async function render(outlet) {
  const [doctorsResponse, servicesResponse] = await Promise.all([
    clinicService.doctors({ page: 1, pageSize: 100 }),
    clinicService.services({ page: 1, pageSize: 100 })
  ]);
  const doctors = doctorsResponse.data || [];
  const services = servicesResponse.data || [];
  let editingId = null;
  let currentRows = [];
  const doctorOptions = `<option value="">كل الأطباء</option>${doctors.map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}`;
  const serviceOptions = `<option value="">كل الخدمات</option>${services.map((service) => `<option value="${service.Id}">${escapeHtml(service.Name)}</option>`).join('')}`;
  const formDoctorOptions = `<option value="">اختر الطبيب</option>${doctors.filter((doctor) => doctor.Status === 'active').map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}`;
  const formServiceOptions = `<option value="">اختر الخدمة</option>${services.filter((service) => service.IsActive).map((service) => `<option value="${service.Id}">${escapeHtml(service.Name)}</option>`).join('')}`;

  outlet.innerHTML = `<div class="section-heading"><div><h1>${icon('tag')} الأسعار</h1><p>إدارة أسعار الطبيب والخدمة مع تاريخ السريان والحالة.</p></div><button id="add-pricing" class="btn btn-primary">${icon('plus')} إضافة سعر</button></div>
    <section id="pricing-editor" class="card mb-5 hidden p-5"><div class="mb-5 flex items-center justify-between"><div><h2 id="pricing-editor-title" class="text-lg font-semibold">إضافة سعر</h2><p class="mt-1 text-xs text-slate-500">السعر المحفوظ في الموعد السابق لا يتغير عند تعديل قائمة الأسعار.</p></div><button id="close-pricing-editor" class="btn btn-ghost" type="button" aria-label="إغلاق">${icon('close')}</button></div><form id="pricing-form"><div class="form-grid"><div><label class="form-label">الطبيب <span class="text-red-500">*</span></label><select class="select" name="doctorId" required>${formDoctorOptions}</select></div><div><label class="form-label">الخدمة <span class="text-red-500">*</span></label><select class="select" name="serviceId" required>${formServiceOptions}</select></div><div><label class="form-label">السعر بالجنيه <span class="text-red-500">*</span></label><input class="input" name="price" type="number" min="0" step="0.01" required></div><div><label class="form-label">الخصم الاختياري %</label><input class="input" name="discountPercent" type="number" min="0" max="100" step="0.01"></div><div><label class="form-label">يبدأ من <span class="text-red-500">*</span></label><input class="input" name="effectiveFrom" type="date" value="${localDateKey()}" required></div><div><label class="form-label">ينتهي في</label><input class="input" name="effectiveTo" type="date"></div><div><label class="form-label">الحالة</label><select class="select" name="isActive"><option value="true">نشط</option><option value="false">غير نشط</option></select></div><div class="span-2"><label class="form-label">ملاحظات</label><textarea class="textarea" name="notes" maxlength="500" rows="2"></textarea></div></div><div class="mt-5 flex justify-end gap-2"><button id="cancel-pricing" class="btn btn-secondary" type="button">إلغاء</button><button class="btn btn-primary" type="submit">${icon('save')} حفظ السعر</button></div></form></section>
    <section class="card"><div class="filter-bar border-b border-slate-100 p-4"><select id="pricing-doctor-filter" class="select w-auto">${doctorOptions}</select><select id="pricing-service-filter" class="select w-auto">${serviceOptions}</select></div><div id="pricing-table" class="table-wrap p-1">${emptyState('جاري تحميل الأسعار...')}</div><div id="pricing-pagination" class="border-t border-slate-100 p-4 text-xs text-slate-500"></div></section>`;
  const editor = document.querySelector('#pricing-editor');
  const form = document.querySelector('#pricing-form');
  const table = document.querySelector('#pricing-table');
  const pagination = document.querySelector('#pricing-pagination');
  const openEditor = (row = null) => {
    editingId = row?.Id || null;
    document.querySelector('#pricing-editor-title').textContent = editingId ? 'تعديل السعر' : 'إضافة سعر';
    form.reset();
    form.elements.doctorId.value = row?.DoctorId || '';
    form.elements.serviceId.value = row?.ServiceId || '';
    form.elements.price.value = row?.Price ?? '';
    form.elements.discountPercent.value = row?.DiscountPercent ?? '';
    form.elements.effectiveFrom.value = row?.EffectiveFrom ? String(row.EffectiveFrom).slice(0, 10) : localDateKey();
    form.elements.effectiveTo.value = row?.EffectiveTo ? String(row.EffectiveTo).slice(0, 10) : '';
    form.elements.isActive.value = String(row?.IsActive !== false);
    form.elements.notes.value = row?.Notes || '';
    editor.classList.remove('hidden');
  };
  const closeEditor = () => { editingId = null; editor.classList.add('hidden'); form.reset(); form.elements.effectiveFrom.value = localDateKey(); };
  const load = async (page = 1) => {
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-2/3"></div></div>';
    try {
      const params = { page, pageSize: 25 };
      if (document.querySelector('#pricing-doctor-filter').value) params.doctorId = document.querySelector('#pricing-doctor-filter').value;
      if (document.querySelector('#pricing-service-filter').value) params.serviceId = document.querySelector('#pricing-service-filter').value;
      const response = await clinicService.pricing(params);
      currentRows = response.data || [];
      table.innerHTML = currentRows.length ? `<table class="data-table"><thead><tr><th>الطبيب</th><th>الخدمة</th><th>السعر</th><th>الخصم</th><th>السريان</th><th>الانتهاء</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${currentRows.map((row) => `<tr><td class="font-semibold">${escapeHtml(row.DoctorName)}</td><td>${escapeHtml(row.ServiceName)}</td><td>${formatMoney(row.Price)}</td><td>${row.DiscountPercent != null ? `${row.DiscountPercent}%` : '—'}</td><td>${formatDate(row.EffectiveFrom)}</td><td>${formatDate(row.EffectiveTo)}</td><td>${statusBadge(row.IsActive ? 'active' : 'inactive')}</td><td><div class="flex gap-1"><button class="btn btn-ghost text-xs" data-edit="${row.Id}">${icon('save')} تعديل</button><button class="btn btn-ghost text-xs" data-toggle="${row.Id}" data-next="${row.IsActive ? 'false' : 'true'}">${row.IsActive ? 'تعطيل' : 'تفعيل'}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('لا توجد أسعار بهذه الفلاتر.', '<button class="btn btn-primary" data-empty-add>إضافة أول سعر</button>');
      const meta = response.meta || {};
      pagination.innerHTML = `<div class="flex items-center justify-between"><span>عرض ${currentRows.length} من ${meta.total || 0}</span><div class="flex gap-2"><button class="btn btn-secondary text-xs" data-page="${Math.max(1, (meta.page || page) - 1)}" ${page <= 1 ? 'disabled' : ''}>السابق</button><span class="self-center">صفحة ${meta.page || page} من ${meta.totalPages || 1}</span><button class="btn btn-secondary text-xs" data-page="${Math.min(meta.totalPages || 1, (meta.page || page) + 1)}" ${page >= (meta.totalPages || 1) ? 'disabled' : ''}>التالي</button></div></div>`;
      table.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openEditor(currentRows.find((row) => row.Id === Number(button.dataset.edit)))));
      table.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', async () => { const row = currentRows.find((item) => item.Id === Number(button.dataset.toggle)); if (!(await confirm(`${button.dataset.next === 'true' ? 'تفعيل' : 'تعطيل'} السعر؟`, 'سيتم الاحتفاظ بسجل السعر للتدقيق.', button.dataset.next === 'true' ? 'تفعيل' : 'تعطيل'))) return; try { await clinicService.updatePricing(row.Id, { doctorId: row.DoctorId, serviceId: row.ServiceId, price: Number(row.Price), discountPercent: row.DiscountPercent == null ? null : Number(row.DiscountPercent), effectiveFrom: String(row.EffectiveFrom).slice(0, 10), effectiveTo: row.EffectiveTo ? String(row.EffectiveTo).slice(0, 10) : null, isActive: button.dataset.next === 'true', notes: row.Notes || null }); toast('تم تحديث حالة السعر'); await load(page); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحديث السعر', text: error.message }); } }));
      table.querySelectorAll('[data-toggle][data-next="false"]').forEach((toggle) => toggle.parentElement.append(archiveButton('archivePricing', toggle.dataset.toggle, 'حذف')));
      table.querySelectorAll('[data-archive-pricing]').forEach((button) => button.addEventListener('click', async () => { if (!(await confirm('أرشفة السعر؟', 'سيظل السعر محفوظًا في السجل، ولن يُستخدم في الحجوزات الجديدة.', 'حذف / أرشفة'))) return; try { await clinicService.deletePricing(button.dataset.archivePricing); toast('تمت أرشفة السعر'); await load(page); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر أرشفة السعر', text: error.message }); } }));
      table.querySelector('[data-empty-add]')?.addEventListener('click', () => openEditor());
      pagination.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => load(Number(button.dataset.page))));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };
  document.querySelector('#add-pricing').addEventListener('click', () => openEditor());
  document.querySelector('#close-pricing-editor').addEventListener('click', closeEditor);
  document.querySelector('#cancel-pricing').addEventListener('click', closeEditor);
  document.querySelectorAll('#pricing-doctor-filter,#pricing-service-filter').forEach((filter) => filter.addEventListener('change', () => load(1)));
  form.addEventListener('submit', async (event) => { event.preventDefault(); const button = form.querySelector('button[type="submit"]'); const data = { doctorId: Number(form.elements.doctorId.value), serviceId: Number(form.elements.serviceId.value), price: Number(form.elements.price.value), discountPercent: form.elements.discountPercent.value ? Number(form.elements.discountPercent.value) : null, effectiveFrom: form.elements.effectiveFrom.value, effectiveTo: form.elements.effectiveTo.value || null, isActive: form.elements.isActive.value === 'true', notes: form.elements.notes.value || null }; loadingButton(button, true); try { if (editingId) await clinicService.updatePricing(editingId, data); else await clinicService.createPricing(data); toast(editingId ? 'تم تعديل السعر' : 'تمت إضافة السعر'); closeEditor(); await load(1); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر حفظ السعر', text: error.message }); } finally { loadingButton(button, false); } });
  await load(1);
}
