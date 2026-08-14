import { api } from '../core/api-service.js';
import { clinicService } from '../services/clinic-service.js';
import { escapeHtml, formatDateTime, statusBadge, emptyState, toast, confirm, localDateKey } from '../core/ui.js';

const activeStatuses = ['booked', 'confirmed', 'arrived', 'waiting', 'late', 'in_consultation'];

export async function render(outlet) {
  const doctors = await clinicService.doctors({ page: 1, pageSize: 100 });
  const today = localDateKey();
  outlet.innerHTML = `<div class="section-heading"><div><h1>Queue management</h1><p>Check-in, reorder, skip, pause and resume the doctor queue.</p></div><div class="flex gap-2"><button id="pause-doctor" class="btn btn-secondary">Pause doctor</button><a class="btn btn-primary" href="/appointments/new?source=walk_in" data-route="/appointments/new">Add walk-in</a></div></div><section class="card"><div class="filter-bar border-b border-slate-100 p-4"><select id="queue-doctor" class="select w-auto"><option value="">Select doctor</option>${(doctors.data || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}</select><input id="queue-date" class="input w-auto" type="date" value="${today}" /><span id="queue-state" class="text-xs text-slate-500">Select a doctor to view the queue.</span></div><div id="queue-table" class="table-wrap p-1">${emptyState('No doctor selected.')}</div></section>`;

  const doctorSelect = document.querySelector('#queue-doctor');
  const dateInput = document.querySelector('#queue-date');
  const table = document.querySelector('#queue-table');
  const state = document.querySelector('#queue-state');
  const load = async () => {
    const doctorId = doctorSelect.value;
    if (!doctorId) { table.innerHTML = emptyState('No doctor selected.'); return; }
    table.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-2/3"></div></div>';
    try {
      const result = await api.get(`/queue?doctorId=${doctorId}&date=${dateInput.value}`);
      const rows = result.entries || [];
      state.innerHTML = `${rows.filter((row) => ['waiting', 'late'].includes(row.Status)).length} waiting · ${result.pause ? `last pause: ${statusBadge(result.pause.Status)}` : 'no pause recorded'}`;
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>#</th><th>Patient</th><th>Service</th><th>Booked</th><th>Expected range</th><th>Wait</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((row) => `<tr><td class="font-bold text-blue-700">#${row.QueueNumber}</td><td><a class="page-link" href="/patients/${row.PatientId}" data-route="/patients/${row.PatientId}">${escapeHtml(row.PatientName)}</a></td><td>${escapeHtml(row.ServiceName)}</td><td>${formatDateTime(row.AppointmentTime)}</td><td>${row.ExpectedStartAt ? `${formatDateTime(row.ExpectedStartAt)} – ${row.ExpectedEndAt ? formatDateTime(row.ExpectedEndAt) : '—'}` : 'Recalculating'}</td><td>${row.CheckedInAt && row.ConsultationStartedAt ? `${Math.max(0, Math.round((new Date(row.ConsultationStartedAt) - new Date(row.CheckedInAt)) / 60000))} min` : '—'}</td><td>${statusBadge(row.Status)}</td><td><div class="flex flex-wrap gap-1">${activeStatuses.includes(row.Status) ? `<button class="btn btn-ghost text-[11px]" data-move="${row.Id}" data-position="${Math.max(1, Number(row.Position) - 1)}" ${Number(row.Position) <= 1 ? 'disabled' : ''}>↑</button><button class="btn btn-ghost text-[11px]" data-move="${row.Id}" data-position="${Number(row.Position) + 1}">↓</button>` : ''}${[['arrived', 'Check-in'], ['waiting', 'Waiting'], ['in_consultation', 'Start'], ['completed', 'Complete'], ['late', 'Late'], ['no_show', 'No show'], ['skipped', 'Skip']].filter(([status]) => status !== row.Status && (status !== 'completed' || ['in_consultation', 'late'].includes(row.Status))).map(([status, label]) => `<button class="btn btn-ghost text-[11px]" data-status-id="${row.Id}" data-status="${status}">${label}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>` : emptyState('No queue entries for this doctor and date.');
      table.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
      table.querySelectorAll('[data-status-id]').forEach((button) => button.addEventListener('click', async () => {
        const status = button.dataset.status;
        if (['no_show', 'skipped'].includes(status) && !(await confirm('Update queue entry?', 'This action is recorded in the audit log.', status === 'no_show'))) return;
        try { await api.patch(`/queue/${button.dataset.statusId}/status`, { status }); toast('Queue updated'); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'Queue update failed', text: error.message }); }
      }));
      table.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', async () => { try { await api.patch(`/queue/${button.dataset.move}/reorder`, { position: Number(button.dataset.position) }); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'Queue reorder failed', text: error.message }); } }));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  doctorSelect.addEventListener('change', load);
  dateInput.addEventListener('change', load);
  document.querySelector('#pause-doctor').addEventListener('click', async () => {
    if (!doctorSelect.value) { toast('Select a doctor first', 'warning'); return; }
    const result = await window.Swal.fire({ title: 'Pause doctor', input: 'text', inputLabel: 'Reason', inputPlaceholder: 'Break, emergency or another operational reason', showCancelButton: true, confirmButtonText: 'Save pause', cancelButtonText: 'Cancel', reverseButtons: true });
    if (!result.isConfirmed) return;
    try { await api.post('/queue/pauses', { doctorId: Number(doctorSelect.value), reason: result.value || null }); toast('Pause recorded'); await load(); } catch (error) { window.Swal.fire({ icon: 'error', title: 'Could not record pause', text: error.message }); }
  });
  document.addEventListener('clinic:realtime', load);
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
}
