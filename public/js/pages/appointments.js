import { appointmentService } from '../services/appointment-service.js';
import { escapeHtml, formatDateTime, statusBadge, emptyState, icon, localDateKey } from '../core/ui.js';

export async function render(outlet) {
  const today = localDateKey();
  outlet.innerHTML = `<div class="section-heading"><div><h1>Appointments</h1><p>Today, upcoming, completed, cancelled and no-show appointments.</p></div><a class="btn btn-primary" href="/appointments/new" data-route="/appointments/new">${icon('plus')} New booking</a></div><section class="card"><div class="filter-bar border-b border-slate-100 p-4"><input id="appointment-date" class="input w-auto" type="date" value="${today}" /><select id="appointment-status" class="select w-auto"><option value="">All statuses</option><option value="booked">Booked</option><option value="confirmed">Confirmed</option><option value="arrived">Arrived</option><option value="waiting">Waiting</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select><input id="appointment-search" class="input min-w-[240px] flex-1" placeholder="Search patient by name or phone" /></div><div id="appointments-table" class="table-wrap p-1"></div></section>`;

  const load = async () => {
    const table = document.querySelector('#appointments-table');
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-full"></div></div>';
    try {
      const response = await appointmentService.list({ date: document.querySelector('#appointment-date').value, status: document.querySelector('#appointment-status').value, search: document.querySelector('#appointment-search').value, page: 1, pageSize: 50 });
      const rows = response.data || [];
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>Patient</th><th>Doctor</th><th>Service</th><th>Appointment</th><th>Source</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((appointment) => `<tr><td><a class="page-link" href="/patients/${appointment.PatientId}" data-route="/patients/${appointment.PatientId}">${escapeHtml(appointment.PatientName)}</a><div class="text-[11px] text-slate-400">${escapeHtml(appointment.PatientCode)}</div></td><td>${escapeHtml(appointment.DoctorName)}</td><td>${escapeHtml(appointment.ServiceName)}</td><td>${formatDateTime(appointment.StartAt)}</td><td>${escapeHtml(appointment.BookingSource)}</td><td>${appointment.Price != null ? `${Number(appointment.Price).toLocaleString('ar-EG')} ج.م` : '—'}</td><td>${statusBadge(appointment.Status)}</td><td><div class="flex gap-1"><button class="btn btn-ghost text-xs" data-reschedule="${appointment.Id}">Reschedule</button>${!['cancelled', 'completed', 'no_show'].includes(appointment.Status) ? `<button class="btn btn-ghost text-xs" data-cancel="${appointment.Id}">Cancel</button>` : ''}</div></td></tr>`).join('')}</tbody></table>` : emptyState('No appointments match these filters.');
      table.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
      table.querySelectorAll('[data-reschedule]').forEach((button) => button.addEventListener('click', () => window.clinicApp.navigate(`/appointments/new?rescheduleId=${button.dataset.reschedule}`)));
      table.querySelectorAll('[data-cancel]').forEach((button) => button.addEventListener('click', async () => {
        const confirmation = await window.Swal.fire({ title: 'Cancel appointment?', text: 'The cancellation reason will be kept in the audit trail.', showCancelButton: true, confirmButtonText: 'Cancel appointment', cancelButtonText: 'Back', reverseButtons: true, confirmButtonColor: '#dc2626' });
        if (!confirmation.isConfirmed) return;
        try { await appointmentService.status(button.dataset.cancel, { status: 'cancelled', reason: 'Cancelled from appointments screen' }); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'Could not cancel', text: error.message }); }
      }));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  await load();
  document.querySelectorAll('#appointment-date,#appointment-status').forEach((element) => element.addEventListener('change', load));
  let searchTimer;
  document.querySelector('#appointment-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 350); });
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  document.addEventListener('clinic:realtime', load);
}
