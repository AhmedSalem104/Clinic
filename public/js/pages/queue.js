import { api } from '../core/api-service.js';
import { clinicService } from '../services/clinic-service.js';
import { escapeHtml, formatDateTime, statusBadge, emptyState, toast, confirm, localDateKey, icon, startPolling } from '../core/ui.js';

const activeStatuses = ['booked', 'confirmed', 'arrived', 'waiting', 'late', 'in_consultation'];
const finishedStatuses = ['completed', 'no_show', 'cancelled', 'skipped'];

const queueBoard = (rows) => {
  const active = rows.filter((row) => activeStatuses.includes(row.Status));
  const completed = rows.filter((row) => row.Status === 'completed').length;
  const current = rows.find((row) => row.Status === 'in_consultation') || active[0];
  const progress = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  return `<section class="queue-live-board" aria-live="polite">
    <div class="queue-now-serving ${current?.Status === 'in_consultation' ? 'is-consulting' : ''}"><span class="queue-board-kicker">${current?.Status === 'in_consultation' ? 'يُكشف الآن' : 'التالي على الدور'}</span><strong>${current ? `#${current.QueueNumber}` : '—'}</strong><span>${current ? escapeHtml(current.PatientName) : 'لا يوجد دور نشط الآن'}</span></div>
    <div class="queue-board-stat"><span>في الانتظار</span><strong>${active.filter((row) => ['booked', 'confirmed', 'arrived', 'waiting', 'late'].includes(row.Status)).length}</strong><small>مريضة</small></div>
    <div class="queue-board-stat queue-board-progress"><div><span>تقدم اليوم</span><strong>${progress}%</strong></div><div class="queue-progress-track"><span style="width:${progress}%"></span></div><small>${completed} من ${rows.length} مكتمل</small></div>
  </section>`;
};

const statusChoices = [
  ['arrived', 'تسجيل الوصول', 'queue-action-arrive'],
  ['waiting', 'وضع انتظار', 'queue-action-waiting'],
  ['in_consultation', 'بدء الكشف', 'queue-action-current'],
  ['completed', 'إكمال الكشف', 'queue-action-complete'],
  ['late', 'تسجيل تأخير', 'queue-action-late'],
  ['no_show', 'لم تحضر', 'queue-action-danger'],
  ['skipped', 'تجاوز الدور', 'queue-action-skip']
];

const queueActions = (row) => {
  const canMove = activeStatuses.includes(row.Status);
  const actions = statusChoices
    .filter(([nextStatus]) => nextStatus !== row.Status && (nextStatus !== 'completed' || ['in_consultation', 'late'].includes(row.Status)))
    .map(([nextStatus, label, className]) => `<button type="button" class="queue-action-button ${className}" data-status-id="${row.Id}" data-status="${nextStatus}">${label}</button>`)
    .join('');
  if (!canMove && !actions) return '<span class="queue-action-closed">لا توجد إجراءات</span>';
  return `<div class="queue-action-panel">
    <div class="queue-action-cluster"><span>ترتيب الدور</span><div class="queue-action-buttons">${canMove ? `<button type="button" class="queue-action-icon" data-move="${row.Id}" data-position="${Math.max(1, Number(row.Position) - 1)}" ${Number(row.Position) <= 1 ? 'disabled' : ''} aria-label="تحريك لأعلى" title="تحريك لأعلى">↑</button><button type="button" class="queue-action-icon" data-move="${row.Id}" data-position="${Number(row.Position) + 1}" aria-label="تحريك لأسفل" title="تحريك لأسفل">↓</button>` : '<small>—</small>'}</div></div>
    <div class="queue-action-cluster queue-status-cluster"><span>تحديث الحالة</span><div class="queue-action-buttons">${actions || '<small>—</small>'}</div></div>
  </div>`;
};

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
      const waitingCount = rows.filter((row) => ['waiting', 'late'].includes(row.Status)).length;
      state.innerHTML = `${waitingCount} في الانتظار · ${result.pause ? `آخر توقف: ${statusBadge(result.pause.Status)}` : 'لا يوجد توقف مسجل'}`;
      const firstActiveId = rows.find((row) => activeStatuses.includes(row.Status))?.Id;
      const tableMarkup = rows.length ? `<div class="queue-board-wrap">${queueBoard(rows)}</div><table class="data-table"><thead><tr><th>#</th><th>المريضة</th><th>الخدمة</th><th>الموعد</th><th>الوقت المتوقع</th><th>الانتظار</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${rows.map((row) => {
        const isCurrent = row.Status === 'in_consultation';
        const isNext = !isCurrent && row.Id === firstActiveId;
        const rowClass = isCurrent ? 'queue-current-row' : isNext ? 'queue-next-row' : '';
        return `<tr class="${rowClass}"><td><span class="queue-number-pill ${isCurrent ? 'is-current' : isNext ? 'is-next' : ''}">#${row.QueueNumber}</span></td><td><a class="page-link" href="/patients/${row.PatientId}" data-route="/patients/${row.PatientId}">${escapeHtml(row.PatientName)}</a>${isCurrent ? '<small class="queue-row-hint">يُكشف الآن</small>' : isNext ? '<small class="queue-row-hint">التالي</small>' : ''}</td><td>${escapeHtml(row.ServiceName)}</td><td>${formatDateTime(row.AppointmentTime)}</td><td>${row.ExpectedStartAt ? `${formatDateTime(row.ExpectedStartAt)} – ${row.ExpectedEndAt ? formatDateTime(row.ExpectedEndAt) : '—'}` : 'جارٍ إعادة الحساب'}</td><td>${row.CheckedInAt && row.ConsultationStartedAt ? `${Math.max(0, Math.round((new Date(row.ConsultationStartedAt) - new Date(row.CheckedInAt)) / 60000))} دقيقة` : '—'}</td><td>${statusBadge(row.Status)}</td><td>${queueActions(row)}</td></tr>`;
      }).join('')}</tbody></table>` : emptyState('لا توجد مريضات في طابور هذا الطبيب وهذا التاريخ.');
      table.innerHTML = tableMarkup;
      table.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
      table.querySelectorAll('[data-status-id]').forEach((button) => button.addEventListener('click', async () => {
        const nextStatus = button.dataset.status;
        if (['no_show', 'skipped'].includes(nextStatus) && !(await confirm('تحديث عنصر الطابور؟', 'سيتم تسجيل هذا الإجراء في سجل التدقيق.', nextStatus === 'no_show' ? 'تسجيل عدم الحضور' : 'تأكيد'))) return;
        try { await api.patch(`/queue/${button.dataset.statusId}/status`, { status: nextStatus }); toast('تم تحديث الطابور'); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر تحديث الطابور', text: error.message }); }
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
  const onRealtime = () => { void load(); };
  document.addEventListener('clinic:realtime', onRealtime);
  const stopPolling = startPolling(load, 10000);
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  return () => {
    stopPolling();
    document.removeEventListener('clinic:realtime', onRealtime);
  };
}
