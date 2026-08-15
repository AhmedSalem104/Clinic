import { api } from '../core/api-service.js';
import { clinicService } from '../services/clinic-service.js';
import { escapeHtml, formatDateTime, statusBadge, emptyState, toast, confirm, localDateKey, icon } from '../core/ui.js';

const activeStatuses = ['booked', 'confirmed', 'arrived', 'waiting', 'late', 'in_consultation'];

export async function render(outlet) {
  const doctors = await clinicService.doctors({ page: 1, pageSize: 100 });
  const today = localDateKey();
  outlet.innerHTML = `<div class="section-heading"><div><h1>${icon('clock')} إدارة الطابور</h1><p>تسجيل الوصول وإعادة الترتيب والتجاوز وإيقاف طابور الطبيب واستئنافه.</p></div><div class="flex gap-2"><button id="pause-doctor" class="btn btn-secondary">${icon('pause')} إيقاف الطبيب</button><a class="btn btn-primary" href="/appointments/new?source=walk_in" data-route="/appointments/new">${icon('plus')} إضافة مريضة بدون موعد</a></div></div><section class="card"><div class="filter-bar border-b border-slate-100 p-4"><select id="queue-doctor" class="select w-auto"><option value="">اختاري الطبيب</option>${(doctors.data || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}</select><input id="queue-date" class="input w-auto" type="date" value="${today}" /><span id="queue-state" class="text-xs text-slate-500">اختاري طبيبًا لعرض الطابور.</span></div><div id="queue-table" class="table-wrap p-1">${emptyState('لم يتم اختيار طبيب.')}</div></section>`;

  const doctorSelect = document.querySelector('#queue-doctor');
  const dateInput = document.querySelector('#queue-date');
  const table = document.querySelector('#queue-table');
  const state = document.querySelector('#queue-state');
  const load = async () => {
    const doctorId = doctorSelect.value;
    if (!doctorId) { table.innerHTML = emptyState('لم يتم اختيار طبيب.'); return; }
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-2/3"></div></div>';
    try {
      const result = await api.get(`/queue?doctorId=${doctorId}&date=${dateInput.value}`);
      const rows = result.entries || [];
      state.innerHTML = `${rows.filter((row) => ['waiting', 'late'].includes(row.Status)).length} في الانتظار · ${result.pause ? `آخر توقف: ${statusBadge(result.pause.Status)}` : 'لا يوجد توقف مسجل'}`;
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>#</th><th>المريضة</th><th>الخدمة</th><th>الموعد</th><th>الوقت المتوقع</th><th>الانتظار</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${rows.map((row) => `<tr><td class="font-bold text-blue-700">#${row.QueueNumber}</td><td><a class="page-link" href="/patients/${row.PatientId}" data-route="/patients/${row.PatientId}">${escapeHtml(row.PatientName)}</a></td><td>${escapeHtml(row.ServiceName)}</td><td>${formatDateTime(row.AppointmentTime)}</td><td>${row.ExpectedStartAt ? `${formatDateTime(row.ExpectedStartAt)} – ${row.ExpectedEndAt ? formatDateTime(row.ExpectedEndAt) : '—'}` : 'جارٍ إعادة الحساب'}</td><td>${row.CheckedInAt && row.ConsultationStartedAt ? `${Math.max(0, Math.round((new Date(row.ConsultationStartedAt) - new Date(row.CheckedInAt)) / 60000))} دقيقة` : '—'}</td><td>${statusBadge(row.Status)}</td><td><div class="flex flex-wrap gap-1">${activeStatuses.includes(row.Status) ? `<button class="btn btn-ghost text-[11px]" data-move="${row.Id}" data-position="${Math.max(1, Number(row.Position) - 1)}" ${Number(row.Position) <= 1 ? 'disabled' : ''} aria-label="تحريك لأعلى">↑</button><button class="btn btn-ghost text-[11px]" data-move="${row.Id}" data-position="${Number(row.Position) + 1}" aria-label="تحريك لأسفل">↓</button>` : ''}${[['arrived', 'تسجيل الوصول'], ['waiting', 'انتظار'], ['in_consultation', 'بدء الكشف'], ['completed', 'إكمال الكشف'], ['late', 'متأخرة'], ['no_show', 'لم تحضر'], ['skipped', 'تجاوز']].filter(([status]) => status !== row.Status && (status !== 'completed' || ['in_consultation', 'late'].includes(row.Status))).map(([status, label]) => `<button class="btn btn-ghost text-[11px]" data-status-id="${row.Id}" data-status="${status}">${label}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>` : emptyState('لا توجد مريضات في طابور هذا الطبيب وهذا التاريخ.');
      table.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
      table.querySelectorAll('[data-status-id]').forEach((button) => button.addEventListener('click', async () => {
        const status = button.dataset.status;
        if (['no_show', 'skipped'].includes(status) && !(await confirm('تحديث عنصر الطابور؟', 'سيتم تسجيل هذا الإجراء في سجل التدقيق.', status === 'no_show' ? 'تسجيل عدم الحضور' : 'تأكيد'))) return;
        try { await api.patch(`/queue/${button.dataset.statusId}/status`, { status }); toast('تم تحديث الطابور'); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحديث الطابور', text: error.message }); }
      }));
      table.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', async () => { try { await api.patch(`/queue/${button.dataset.move}/reorder`, { position: Number(button.dataset.position) }); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر إعادة ترتيب الطابور', text: error.message }); } }));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  doctorSelect.addEventListener('change', load);
  dateInput.addEventListener('change', load);
  document.querySelector('#pause-doctor').addEventListener('click', async () => {
    if (!doctorSelect.value) { toast('اختاري الطبيب أولًا', 'warning'); return; }
    const result = await window.Swal.fire({ title: 'إيقاف الطبيب مؤقتًا', input: 'text', inputLabel: 'السبب', inputPlaceholder: 'استراحة أو طارئ أو سبب تشغيلي آخر', showCancelButton: true, confirmButtonText: 'حفظ التوقف', cancelButtonText: 'إلغاء', reverseButtons: true });
    if (!result.isConfirmed) return;
    try { await api.post('/queue/pauses', { doctorId: Number(doctorSelect.value), reason: result.value || null }); toast('تم تسجيل التوقف'); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تسجيل التوقف', text: error.message }); }
  });
  document.addEventListener('clinic:realtime', load);
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
}
