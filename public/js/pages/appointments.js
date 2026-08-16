import { appointmentService } from '../services/appointment-service.js';
import { auth } from '../core/auth.js';
import { can } from '../core/permissions.js';
import { escapeHtml, formatDateTime, statusBadge, emptyState, icon, localDateKey, startPolling } from '../core/ui.js';

const bookingSourceLabel = { online: 'إلكتروني', phone: 'هاتف', walk_in: 'بدون موعد', reception: 'الريسبشن' };

export async function render(outlet) {
  const today = localDateKey();
  const canManage = can(auth.user(), 'appointments:manage');
  outlet.innerHTML = `<div class="section-heading"><div><h1>${icon('calendar')} الحجوزات</h1><p>حجوزات اليوم، مع إمكانية تغيير التاريخ لرؤية حجوزات المريضة في أي يوم قادم.</p></div>${canManage ? `<a class="btn btn-primary" href="/appointments/new" data-route="/appointments/new">${icon('plus')} حجز جديد</a>` : ''}</div><section class="card"><div class="filter-bar border-b border-slate-100 p-4"><input id="appointment-date" class="input w-auto" type="date" value="${today}" /><button id="appointment-all-dates" class="btn btn-secondary text-xs" type="button">${icon('calendar')} كل التواريخ</button><select id="appointment-status" class="select w-auto"><option value="">كل الحالات</option><option value="booked">محجوز</option><option value="confirmed">مؤكد</option><option value="arrived">وصلت</option><option value="waiting">في الانتظار</option><option value="completed">مكتمل</option><option value="cancelled">ملغى</option><option value="no_show">لم تحضر</option></select><input id="appointment-search" class="input min-w-[240px] flex-1" placeholder="ابحثي باسم المريضة أو الهاتف" /></div><div id="appointments-table" class="table-wrap p-1"></div></section>`;

  const load = async () => {
    const table = document.querySelector('#appointments-table');
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-full"></div></div>';
    try {
      const response = await appointmentService.list({ date: document.querySelector('#appointment-date').value, status: document.querySelector('#appointment-status').value, search: document.querySelector('#appointment-search').value, page: 1, pageSize: 50 });
      const rows = response.data || [];
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>المريضة</th><th>الطبيب</th><th>الخدمة</th><th>الموعد</th><th>المصدر</th><th>السعر</th><th>الحالة</th>${canManage ? '<th>الإجراءات</th>' : ''}</tr></thead><tbody>${rows.map((appointment) => `<tr><td><a class="page-link" href="/patients/${appointment.PatientId}" data-route="/patients/${appointment.PatientId}">${escapeHtml(appointment.PatientName)}</a><div class="text-[11px] text-slate-400">${escapeHtml(appointment.PatientCode)}</div></td><td>${escapeHtml(appointment.DoctorName)}</td><td>${escapeHtml(appointment.ServiceName)}</td><td>${formatDateTime(appointment.StartAt)}</td><td>${escapeHtml(bookingSourceLabel[appointment.BookingSource] || appointment.BookingSource || '—')}</td><td>${appointment.Price != null ? `${Number(appointment.Price).toLocaleString('ar-EG')} ج.م` : '—'}</td><td>${statusBadge(appointment.Status)}</td>${canManage ? `<td><div class="flex gap-1"><button class="btn btn-ghost text-xs" data-reschedule="${appointment.Id}">${icon('calendar')} إعادة جدولة</button>${!['cancelled', 'completed', 'no_show'].includes(appointment.Status) ? `<button class="btn btn-ghost text-xs" data-cancel="${appointment.Id}">${icon('close')} إلغاء</button>` : ''}</div></td>` : ''}</tr>`).join('')}</tbody></table>` : emptyState('لا توجد حجوزات بهذا التاريخ. جرّبي اختيار «كل التواريخ» أو تاريخ الحجز.');
      table.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
      table.querySelectorAll('[data-reschedule]').forEach((button) => button.addEventListener('click', () => window.clinicApp.navigate(`/appointments/new?rescheduleId=${button.dataset.reschedule}`)));
      table.querySelectorAll('[data-cancel]').forEach((button) => button.addEventListener('click', async () => {
        const confirmation = await window.Swal.fire({ title: 'إلغاء الموعد؟', text: 'سيتم حفظ سبب الإلغاء في سجل التدقيق.', showCancelButton: true, confirmButtonText: 'إلغاء الموعد', cancelButtonText: 'رجوع', reverseButtons: true, confirmButtonColor: '#dc2626' });
        if (!confirmation.isConfirmed) return;
        try { await appointmentService.status(button.dataset.cancel, { status: 'cancelled', reason: 'Cancelled from appointments screen' }); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر إلغاء الموعد', text: error.message }); }
      }));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  await load();
  document.querySelectorAll('#appointment-date,#appointment-status').forEach((element) => element.addEventListener('change', load));
  document.querySelector('#appointment-all-dates')?.addEventListener('click', () => { document.querySelector('#appointment-date').value = ''; load(); });
  let searchTimer;
  document.querySelector('#appointment-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 350); });
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  const onRealtime = () => { void load(); };
  document.addEventListener('clinic:realtime', onRealtime);
  const stopPolling = startPolling(load, 10000);
  return () => {
    clearTimeout(searchTimer);
    stopPolling();
    document.removeEventListener('clinic:realtime', onRealtime);
  };
}
