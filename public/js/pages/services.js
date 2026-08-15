import { clinicService } from '../services/clinic-service.js';
import { escapeHtml, emptyState, statusBadge, icon, toast, loadingButton, debounce, confirm, deleteButton } from '../core/ui.js';

export async function render(outlet) {
  let editingId = null;
  outlet.innerHTML = `<div class="section-heading"><div><h1>${icon('tag')} الخدمات</h1><p>تعريف خدمات العيادة ومدتها وقواعد الحجز والطابور.</p></div><button id="add-service" class="btn btn-primary">${icon('plus')} إضافة خدمة</button></div>
    <section id="service-editor" class="card mb-5 hidden p-5"><div class="mb-5 flex items-center justify-between"><div><h2 id="service-editor-title" class="text-lg font-semibold">إضافة خدمة</h2><p class="mt-1 text-xs text-slate-500">تغيير مدة الخدمة يؤثر على المواعيد الجديدة وحساب الانتظار.</p></div><button id="close-service-editor" class="btn btn-ghost" type="button" aria-label="إغلاق">${icon('close')}</button></div><form id="service-form"><div class="form-grid"><div><label class="form-label">اسم الخدمة <span class="text-red-500">*</span></label><input class="input" name="name" maxlength="160" required></div><div><label class="form-label">التصنيف</label><input class="input" name="category" maxlength="100"></div><div><label class="form-label">المدة الأساسية بالدقائق <span class="text-red-500">*</span></label><input class="input" name="baseDurationMinutes" type="number" min="1" max="480" value="20" required></div><div><label class="form-label">الحالة</label><select class="select" name="isActive"><option value="true">نشطة</option><option value="false">غير نشطة</option></select></div><div class="flex items-center gap-5 pt-7"><label class="flex items-center gap-2 text-xs"><input type="checkbox" name="requiresQueue" checked> تحتاج طابور</label><label class="flex items-center gap-2 text-xs"><input type="checkbox" name="requiresBooking" checked> تحتاج حجز</label></div></div><div class="mt-5 flex justify-end gap-2"><button id="cancel-service" class="btn btn-secondary" type="button">إلغاء</button><button class="btn btn-primary" type="submit">${icon('save')} حفظ الخدمة</button></div></form></section>
    <section class="card"><div class="filter-bar border-b border-slate-100 p-4"><div class="relative min-w-[260px] flex-1"><span class="pointer-events-none absolute right-3 top-3 text-slate-400">${icon('search')}</span><input id="service-search" class="input pr-10" placeholder="ابحث باسم الخدمة أو التصنيف" aria-label="بحث الخدمات"></div></div><div id="services-table" class="table-wrap p-1">${emptyState('جاري تحميل الخدمات...')}</div><div id="services-pagination" class="border-t border-slate-100 p-4 text-xs text-slate-500"></div></section>`;
  const editor = document.querySelector('#service-editor');
  const form = document.querySelector('#service-form');
  const table = document.querySelector('#services-table');
  const pagination = document.querySelector('#services-pagination');
  const search = document.querySelector('#service-search');
  const openEditor = (service = null) => {
    editingId = service?.Id || null;
    document.querySelector('#service-editor-title').textContent = editingId ? 'تعديل الخدمة' : 'إضافة خدمة';
    form.reset();
    form.elements.name.value = service?.Name || '';
    form.elements.category.value = service?.Category || '';
    form.elements.baseDurationMinutes.value = service?.BaseDurationMinutes || 20;
    form.elements.isActive.value = String(service?.IsActive !== false);
    form.elements.requiresQueue.checked = service?.RequiresQueue !== false;
    form.elements.requiresBooking.checked = service?.RequiresBooking !== false;
    editor.classList.remove('hidden');
    form.elements.name.focus();
  };
  const closeEditor = () => { editingId = null; editor.classList.add('hidden'); form.reset(); form.elements.baseDurationMinutes.value = 20; };
  const load = async (page = 1) => {
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-2/3"></div></div>';
    try {
      const response = await clinicService.services({ page, pageSize: 25, search: search.value.trim() });
      const rows = response.data || [];
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>الخدمة</th><th>التصنيف</th><th>المدة</th><th>الطابور</th><th>الحجز</th><th>الأطباء</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${rows.map((service) => `<tr><td class="font-semibold">${escapeHtml(service.Name)}</td><td>${escapeHtml(service.Category || '—')}</td><td>${service.BaseDurationMinutes} دقيقة</td><td>${service.RequiresQueue ? 'نعم' : 'لا'}</td><td>${service.RequiresBooking ? 'نعم' : 'لا'}</td><td>${service.DoctorCount || 0}</td><td>${statusBadge(service.IsActive ? 'active' : 'inactive')}</td><td><div class="flex gap-1"><button class="btn btn-ghost text-xs" data-edit="${service.Id}">${icon('save')} تعديل</button><button class="btn btn-ghost text-xs" data-toggle="${service.Id}" data-next="${service.IsActive ? 'false' : 'true'}">${service.IsActive ? 'تعطيل' : 'تفعيل'}</button></div></td></tr>`).join('')}</tbody></table>` : emptyState('لا توجد خدمات مطابقة.', '<button class="btn btn-primary" data-empty-add>إضافة أول خدمة</button>');
      const meta = response.meta || {};
      pagination.innerHTML = `<div class="flex items-center justify-between"><span>عرض ${rows.length} من ${meta.total || 0}</span><div class="flex gap-2"><button class="btn btn-secondary text-xs" data-page="${Math.max(1, (meta.page || page) - 1)}" ${page <= 1 ? 'disabled' : ''}>السابق</button><span class="self-center">صفحة ${meta.page || page} من ${meta.totalPages || 1}</span><button class="btn btn-secondary text-xs" data-page="${Math.min(meta.totalPages || 1, (meta.page || page) + 1)}" ${page >= (meta.totalPages || 1) ? 'disabled' : ''}>التالي</button></div></div>`;
      table.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', async () => { try { const response = await clinicService.services({ page: 1, pageSize: 100, search: '' }); openEditor((response.data || []).find((item) => item.Id === Number(button.dataset.edit))); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحميل الخدمة', text: error.message }); } }));
      table.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', async () => { if (!(await confirm(`${button.dataset.next === 'true' ? 'تفعيل' : 'تعطيل'} الخدمة؟`, 'سيتم الاحتفاظ بالحجوزات السابقة.', button.dataset.next === 'true' ? 'تفعيل' : 'تعطيل'))) return; try { const response = await clinicService.services({ page: 1, pageSize: 100, search: '' }); const service = (response.data || []).find((item) => item.Id === Number(button.dataset.toggle)); await clinicService.updateService(button.dataset.toggle, { name: service.Name, category: service.Category, baseDurationMinutes: service.BaseDurationMinutes, requiresQueue: Boolean(service.RequiresQueue), requiresBooking: Boolean(service.RequiresBooking), isActive: button.dataset.next === 'true' }); toast('تم تحديث حالة الخدمة'); await load(page); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحديث الحالة', text: error.message }); } }));
      table.querySelectorAll('[data-toggle]').forEach((toggle) => toggle.parentElement.append(deleteButton('deleteService', toggle.dataset.toggle)));
      table.querySelectorAll('[data-delete-service]').forEach((button) => button.addEventListener('click', async () => { if (!(await confirm('حذف الخدمة نهائيًا؟', 'سيتم حذف الخدمة وإعداداتها إذا لم توجد حجوزات أو عناصر طابور مرتبطة بها. لا يمكن التراجع عن هذه العملية.', 'حذف نهائي'))) return; try { await clinicService.deleteService(button.dataset.deleteService); toast('تم حذف الخدمة نهائيًا'); await load(page); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر حذف الخدمة', text: error.message }); } }));
      table.querySelector('[data-empty-add]')?.addEventListener('click', () => openEditor());
      pagination.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => load(Number(button.dataset.page))));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };
  document.querySelector('#add-service').addEventListener('click', () => openEditor());
  document.querySelector('#close-service-editor').addEventListener('click', closeEditor);
  document.querySelector('#cancel-service').addEventListener('click', closeEditor);
  form.addEventListener('submit', async (event) => { event.preventDefault(); const button = form.querySelector('button[type="submit"]'); const data = { name: form.elements.name.value, category: form.elements.category.value || null, baseDurationMinutes: Number(form.elements.baseDurationMinutes.value), requiresQueue: form.elements.requiresQueue.checked, requiresBooking: form.elements.requiresBooking.checked, isActive: form.elements.isActive.value === 'true' }; loadingButton(button, true); try { if (editingId) await clinicService.updateService(editingId, data); else await clinicService.createService(data); toast(editingId ? 'تم تعديل الخدمة' : 'تمت إضافة الخدمة'); closeEditor(); await load(1); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر حفظ الخدمة', text: error.message }); } finally { loadingButton(button, false); } });
  search.addEventListener('input', debounce(() => load(1), 350));
  await load(1);
}
