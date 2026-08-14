import { patientService } from '../services/patient-service.js';
import { clinicService } from '../services/clinic-service.js';
import { medicalService } from '../services/medical-service.js';
import { auth } from '../core/auth.js';
import { debounce, escapeHtml, emptyState, loadingButton, statusBadge, toast } from '../core/ui.js';

export async function render(outlet) {
  const user = auth.user();
  const doctors = await clinicService.doctors({ page: 1, pageSize: 100 });
  let selected = null;
  let cases = [];

  outlet.innerHTML = `<div class="section-heading"><div><h1>Patient assignments</h1><p>Assign a primary doctor or, for the owner, a doctor to a specific clinical case.</p></div></div><section class="card p-5"><label class="form-label">Search patient</label><div class="relative"><input id="assignment-search" class="input" placeholder="Name, phone or Patient ID" autocomplete="off" /><div id="assignment-results" class="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg"></div></div><div id="assignment-selected" class="mt-3">${emptyState('Select a patient to manage assignments.')}</div></section><section id="assignment-editor" class="card mt-5 hidden p-5"><div class="mb-4"><h2 class="font-semibold">New assignment</h2><p class="mt-1 text-xs text-slate-500">The previous active assignment is closed and remains in history.</p></div><form id="assignment-form" class="form-grid"><div><label class="form-label">Doctor</label><select class="select" name="doctorId" required><option value="">Select doctor</option>${(doctors.data || []).filter((doctor) => doctor.Status === 'active').map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}</option>`).join('')}</select></div><div><label class="form-label">Assignment type</label><select class="select" name="assignmentType"><option value="primary">Primary doctor</option>${user?.role === 'owner' ? '<option value="case">Case doctor</option>' : ''}</select></div><div id="assignment-case-wrap" class="hidden"><label class="form-label">Case</label><select class="select" name="caseId"><option value="">Select case</option></select></div><div class="flex items-end"><button class="btn btn-primary w-full" type="submit">Save assignment</button></div></form></section><section class="card mt-5"><div class="border-b border-slate-100 px-5 py-4"><h2 class="font-semibold">Assignment history</h2></div><div id="assignment-table" class="table-wrap p-1">${emptyState('Select a patient to view assignment history.')}</div></section>`;

  const search = document.querySelector('#assignment-search');
  const results = document.querySelector('#assignment-results');
  const editor = document.querySelector('#assignment-editor');
  const selectedBox = document.querySelector('#assignment-selected');
  const table = document.querySelector('#assignment-table');
  const typeSelect = document.querySelector('[name="assignmentType"]');
  const caseWrap = document.querySelector('#assignment-case-wrap');
  const caseSelect = document.querySelector('[name="caseId"]');

  const renderAssignments = async () => {
    if (!selected) return;
    try {
      const rows = await patientService.assignments(selected.Id);
      table.innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>Doctor</th><th>Type</th><th>Case</th><th>Assigned at</th><th>Ended at</th><th>Status</th></tr></thead><tbody>${rows.map((row) => `<tr><td class="font-semibold">${escapeHtml(row.DoctorName)}</td><td>${escapeHtml(row.AssignmentType)}</td><td>${escapeHtml(row.CaseId || '—')}</td><td>${new Date(row.AssignedAt).toLocaleString('ar-EG')}</td><td>${row.EndedAt ? new Date(row.EndedAt).toLocaleString('ar-EG') : '—'}</td><td>${row.EndedAt ? statusBadge('closed') : statusBadge('active')}</td></tr>`).join('')}</tbody></table>` : emptyState('No assignments found.');
    } catch (error) { table.innerHTML = `<div class="p-5 text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  const loadCases = async () => {
    cases = user?.role === 'owner' && selected ? await medicalService.cases(selected.Id) : [];
    caseSelect.innerHTML = `<option value="">Select case</option>${cases.map((item) => `<option value="${item.Id}">${escapeHtml(item.Type)} · ${escapeHtml(item.Status)}</option>`).join('')}`;
  };
  const setSelected = async (patient) => {
    selected = patient;
    search.value = patient.FullName;
    results.innerHTML = '';
    selectedBox.innerHTML = `<div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2">·</span>${escapeHtml(patient.PatientCode)}<span class="mx-2">·</span>${escapeHtml(patient.Phone)}</div>`;
    editor.classList.remove('hidden');
    await loadCases();
    await renderAssignments();
  };

  search.addEventListener('input', debounce(async () => {
    const value = search.value.trim();
    if (value.length < 2) { results.innerHTML = ''; return; }
    try {
      const response = await patientService.list({ search: value, page: 1, pageSize: 8 });
      results.innerHTML = (response.data || []).map((patient) => `<button type="button" class="block w-full border-b border-slate-100 p-3 text-right text-sm hover:bg-slate-50" data-patient="${patient.Id}"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-xs text-slate-400">${escapeHtml(patient.PatientCode)} · ${escapeHtml(patient.Phone)}</span></button>`).join('') || '<div class="p-3 text-xs text-slate-500">No patients found.</div>';
      results.querySelectorAll('[data-patient]').forEach((button) => button.addEventListener('click', async () => setSelected(await patientService.get(Number(button.dataset.patient)))));
    } catch (error) { results.innerHTML = `<div class="p-3 text-xs text-red-600">${escapeHtml(error.message)}</div>`; }
  }, 350));

  typeSelect.addEventListener('change', () => caseWrap.classList.toggle('hidden', typeSelect.value !== 'case'));
  document.querySelector('#assignment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selected) return;
    const button = event.currentTarget.querySelector('button[type=submit]');
    loadingButton(button, true);
    try {
      await patientService.assign(selected.Id, { doctorId: Number(event.currentTarget.doctorId.value), assignmentType: event.currentTarget.assignmentType.value, caseId: event.currentTarget.assignmentType.value === 'case' ? Number(event.currentTarget.caseId.value) : null });
      toast('Assignment saved');
      event.currentTarget.reset();
      caseWrap.classList.add('hidden');
      await renderAssignments();
    } catch (error) { window.Swal.fire({ icon: 'error', title: 'Assignment could not be saved', text: error.message }); }
    finally { loadingButton(button, false); }
  });
}
