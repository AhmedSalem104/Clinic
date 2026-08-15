import { patientService } from '../services/patient-service.js';
import { medicalService } from '../services/medical-service.js';
import { auth } from '../core/auth.js';
import { escapeHtml, formatDate, formatDateTime, statusBadge, emptyState, icon } from '../core/ui.js';

const allTabs = [
  ['overview', 'نظرة عامة'], ['visits', 'الزيارات'], ['cases', 'الحالات'], ['pregnancy', 'الحمل'],
  ['medications', 'الأدوية'], ['allergies', 'الحساسيات'], ['labs', 'التحاليل'], ['ultrasound', 'السونار'],
  ['documents', 'المستندات'], ['progress', 'التطور'], ['reports', 'التقارير'], ['timeline', 'الخط الزمني']
];
let patientId;

const table = (headers, rows, message = 'No records found.') => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : emptyState(message);
const openModule = (route) => `<button class="btn btn-primary" data-open-module="${route}">${icon('plus')} Add record</button>`;

const renderTab = async (name, patient) => {
  const panel = document.querySelector('#profile-tab-panel');
  panel.innerHTML = '<div class="p-8"><div class="skeleton mb-4 h-5 w-full"></div><div class="skeleton h-5 w-2/3"></div></div>';
  try {
    if (name === 'overview') {
      panel.innerHTML = `<div class="grid grid-cols-1 gap-5 lg:grid-cols-3"><section class="card p-5 lg:col-span-2"><h2 class="font-semibold">Quick medical summary</h2><div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">${[['Last visit', formatDate(patient.LatestVisitDate)], ['Latest diagnosis', patient.LatestDiagnosis || '—'], ['Current case', patient.CurrentCase || '—'], ['Active pregnancy', patient.ActivePregnancyId ? `EDD ${formatDate(patient.EDD)}` : 'None'], ['Next appointment', patient.appointments?.find((item) => new Date(item.StartAt) >= new Date()) ? formatDateTime(patient.appointments.find((item) => new Date(item.StartAt) >= new Date()).StartAt) : '—'], ['Allergy alerts', patient.allergies?.length || 0]].map(([label, value]) => `<div class="rounded-lg bg-slate-50 p-3"><div class="text-xs text-slate-500">${label}</div><div class="mt-2 text-sm font-semibold">${escapeHtml(value)}</div></div>`).join('')}</div></section><section class="card p-5"><h2 class="font-semibold">Important alerts</h2><div class="mt-4 space-y-3">${patient.HighRiskFlag ? '<div class="alert alert-danger"><span>!</span><span>High-risk flag — clinician review required.</span></div>' : ''}${patient.allergies?.length ? patient.allergies.map((item) => `<div class="alert alert-warning"><span>!</span><span>${escapeHtml(item.Substance)}${item.Reaction ? ` · ${escapeHtml(item.Reaction)}` : ''}</span></div>`).join('') : '<div class="text-sm text-slate-500">No important alerts recorded.</div>'}</div></section></div><section class="card mt-5"><div class="border-b border-slate-100 px-5 py-4"><h2 class="font-semibold">Recent appointments</h2></div>${table(['Service', 'Doctor', 'Appointment', 'Status'], (patient.appointments || []).map((item) => `<tr><td>${escapeHtml(item.ServiceName)}</td><td>${escapeHtml(item.DoctorName)}</td><td>${formatDateTime(item.StartAt)}</td><td>${statusBadge(item.Status)}</td></tr>`), 'No appointments found.')}</section>`;
    } else if (name === 'visits') {
      const response = await medicalService.visits({ patientId, page: 1, pageSize: 25 });
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><div><h2 class="font-semibold">Visits</h2><p class="mt-1 text-xs text-slate-500">An encounter is stored separately from the booking.</p></div>${openModule('/visits')}</div>${table(['Date', 'Type', 'Doctor', 'Assessment', 'Status'], (response.data || []).map((item) => `<tr><td>${formatDateTime(item.CreatedAt)}</td><td>${escapeHtml(item.VisitType)}</td><td>${escapeHtml(item.DoctorName)}</td><td>${escapeHtml(item.Assessment || '—')}</td><td>${statusBadge(item.Status)}</td></tr>`))}`;
    } else if (name === 'cases') {
      const rows = await medicalService.cases(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Cases</h2>${openModule('/cases')}</div>${table(['Type', 'Doctor', 'Start', 'Status', 'Summary'], rows.map((item) => `<tr><td class="font-semibold">${escapeHtml(item.Type)}</td><td>${escapeHtml(item.AssignedDoctor || '—')}</td><td>${formatDate(item.StartDate)}</td><td>${statusBadge(item.Status)}</td><td>${escapeHtml(item.Summary || '—')}</td></tr>`))}`;
    } else if (name === 'pregnancy') {
      const rows = await medicalService.pregnancies(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Pregnancy records</h2>${openModule('/pregnancy')}</div>${table(['Number', 'LMP', 'EDD', 'Method', 'Doctor', 'Status'], rows.map((item) => `<tr><td>${escapeHtml(item.PregnancyNumber || '—')}</td><td>${formatDate(item.LMP)}</td><td>${formatDate(item.EDD)}</td><td>${escapeHtml(item.EDDMethod || '—')}</td><td>${escapeHtml(item.AssignedDoctor || '—')}</td><td>${statusBadge(item.Status)}</td></tr>`))}`;
    } else if (name === 'medications') {
      const rows = await medicalService.medication(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Medications</h2>${openModule('/medications')}</div>${table(['Drug', 'Dose / route', 'Frequency', 'Indication', 'Start', 'Status'], rows.map((item) => `<tr><td class="font-semibold">${escapeHtml(item.DrugName)}</td><td>${escapeHtml(item.Dose)} ${escapeHtml(item.DoseUnit || '')} · ${escapeHtml(item.Route || '—')}</td><td>${escapeHtml(item.Frequency)}</td><td>${escapeHtml(item.Indication || '—')}</td><td>${formatDate(item.StartDate)}</td><td>${statusBadge(item.Status)}</td></tr>`))}`;
    } else if (name === 'allergies') {
      const rows = await medicalService.allergies(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Allergies and restrictions</h2>${openModule('/allergies')}</div>${table(['Substance', 'Reaction', 'Severity', 'Status', 'Recorded'], rows.map((item) => `<tr><td class="font-semibold">${escapeHtml(item.Substance)}</td><td>${escapeHtml(item.Reaction || '—')}</td><td>${escapeHtml(item.Severity || 'Unknown')}</td><td>${statusBadge(item.Status)}</td><td>${formatDate(item.RecordedAt)}</td></tr>`))}`;
    } else if (name === 'labs') {
      const rows = await medicalService.labs(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Lab tests</h2>${openModule('/labs')}</div>${table(['Test', 'Result date', 'Result', 'Unit', 'Reference', 'Flag', 'Status'], rows.map((item) => `<tr><td class="font-semibold">${escapeHtml(item.TestName)}</td><td>${formatDate(item.ResultDate || item.RequestedDate)}</td><td>${escapeHtml(item.ResultNumeric ?? item.ResultText ?? '—')}</td><td>${escapeHtml(item.Unit || '—')}</td><td>${escapeHtml(item.ReferenceRange || '—')}</td><td>${statusBadge(item.AbnormalFlag || 'neutral')}</td><td>${statusBadge(item.Status)}</td></tr>`))}`;
    } else if (name === 'ultrasound') {
      const rows = await medicalService.ultrasounds(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Ultrasound</h2>${openModule('/ultrasound')}</div>${table(['Date', 'Type', 'Performed by', 'GA', 'FHR', 'Impression'], rows.map((item) => `<tr><td>${formatDate(item.StudyDate)}</td><td>${escapeHtml(item.StudyType)}</td><td>${escapeHtml(item.PerformedByName)}</td><td>${item.GestationalAgeWeeks != null ? `${item.GestationalAgeWeeks}+${item.GestationalAgeDays || 0}` : '—'}</td><td>${item.FetalHeartRateBpm || '—'}</td><td>${escapeHtml(item.Impression || '—')}</td></tr>`))}`;
    } else if (name === 'documents') {
      const rows = await medicalService.documents(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Documents</h2>${openModule('/documents')}</div>${table(['Type', 'File', 'Date', 'Size', 'Uploaded by'], rows.map((item) => `<tr><td>${escapeHtml(item.DocumentType)}</td><td><a class="page-link" href="/api/documents/${item.Id}/download" target="_blank">${escapeHtml(item.FileName)}</a></td><td>${formatDate(item.DocumentDate)}</td><td>${Math.round(Number(item.FileSizeBytes) / 1024)} KB</td><td>${escapeHtml(item.UploadedByName)}</td></tr>`))}`;
    } else if (name === 'progress') {
      const rows = await medicalService.progress(patientId);
      panel.innerHTML = `<div class="mb-4 flex items-center justify-between"><div><h2 class="font-semibold">Progress indicators</h2><p class="mt-1 text-xs text-slate-500">Trend labels require clinician review; they are not automated diagnoses.</p></div>${openModule('/progress')}</div>${table(['Indicator', 'Value', 'Unit', 'Recorded', 'Trend', 'Validated'], rows.map((item) => `<tr><td class="font-semibold">${escapeHtml(item.IndicatorName)}</td><td>${escapeHtml(item.ValueNumeric ?? item.ValueText ?? '—')}</td><td>${escapeHtml(item.Unit || '—')}</td><td>${formatDateTime(item.RecordedAt)}</td><td>${statusBadge(item.TrendStatus || 'neutral')}</td><td>${item.DoctorValidated ? '✓' : '—'}</td></tr>`))}`;
    } else if (name === 'reports') {
      panel.innerHTML = `<section class="card bg-slate-50 p-5"><h2 class="font-semibold">Patient reports</h2><p class="mt-2 text-sm text-slate-500">Open the report builder to view, print or export a medical summary.</p><button class="btn btn-primary mt-4" data-open-module="/reports">Open reports</button></section>`;
    } else if (name === 'timeline') {
      const [visits, cases, medications, labs, ultrasounds] = await Promise.all([medicalService.visits({ patientId, page: 1, pageSize: 25 }), medicalService.cases(patientId), medicalService.medication(patientId), medicalService.labs(patientId), medicalService.ultrasounds(patientId)]);
      const events = [...(visits.data || []).map((item) => ({ date: item.CreatedAt, type: 'Visit', title: item.VisitType, detail: item.Assessment })), ...cases.map((item) => ({ date: item.StartDate, type: 'Case', title: item.Type, detail: item.Summary })), ...medications.map((item) => ({ date: item.StartDate, type: 'Medication', title: item.DrugName, detail: `${item.Dose} · ${item.Frequency}` })), ...labs.map((item) => ({ date: item.ResultDate || item.RequestedDate, type: 'Lab', title: item.TestName, detail: item.ResultText || item.ResultNumeric })), ...ultrasounds.map((item) => ({ date: item.StudyDate, type: 'Ultrasound', title: item.StudyType, detail: item.Impression }))].sort((a, b) => new Date(b.date) - new Date(a.date));
      panel.innerHTML = events.length ? `<div class="space-y-5">${events.map((event) => `<div class="timeline-line"><span class="timeline-dot"></span><div class="text-xs text-slate-400">${formatDate(event.date)} · ${escapeHtml(event.type)}</div><div class="mt-1 font-semibold">${escapeHtml(event.title)}</div><div class="mt-1 text-sm text-slate-500">${escapeHtml(event.detail || '—')}</div></div>`).join('')}</div>` : emptyState('No timeline events found.');
    }
  } catch (error) {
    panel.innerHTML = `<div class="card p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`;
  }
  panel.querySelectorAll('[data-open-module]').forEach((button) => button.addEventListener('click', () => window.clinicApp.navigate(`${button.dataset.openModule}?patientId=${patientId}`)));
};

export async function render(outlet, context) {
  patientId = Number(context.params[0]);
  try {
    const patient = await patientService.get(patientId);
    const visibleTabs = ['owner', 'doctor'].includes(auth.user()?.role) ? allTabs : [allTabs[0]];
    const canEdit = ['owner', 'reception'].includes(auth.user()?.role);
    outlet.innerHTML = `<div class="mb-5"><a class="page-link text-xs" href="/patients" data-route="/patients">← العودة إلى المريضات</a></div><section class="card p-5"><div class="flex flex-wrap items-start justify-between gap-4"><div class="flex items-center gap-4"><div class="grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">${escapeHtml(patient.FullName?.split(' ').slice(0, 2).map((part) => part[0]).join(''))}</div><div><div class="flex items-center gap-2"><h1 class="text-xl font-bold">${escapeHtml(patient.FullName)}</h1>${patient.HighRiskFlag ? '<span class="badge badge-danger">! متابعة خاصة</span>' : ''}${statusBadge(patient.ProfileStatus || 'complete')}</div><div class="mt-2 text-xs text-slate-500">${escapeHtml(patient.PatientCode)} · ${escapeHtml(patient.Phone)} · ${patient.DateOfBirth ? formatDate(patient.DateOfBirth) : 'تاريخ الميلاد غير مسجل'}</div><div class="mt-2 text-xs text-slate-500">الطبيب الأساسي: <strong>${escapeHtml(patient.AssignedDoctor || 'غير مسندة')}</strong> · الحالة: <strong>${escapeHtml(patient.CurrentCase || 'لا توجد')}</strong></div></div></div><div class="flex flex-wrap gap-2">${canEdit ? `<a class="btn btn-secondary" href="/patients/edit?patientId=${patient.Id}" data-route="/patients/edit?patientId=${patient.Id}">استكمال البيانات</a>` : ''}<a class="btn btn-secondary" href="/reports?patientId=${patient.Id}" data-route="/reports?patientId=${patient.Id}">التقرير الطبي</a>${canEdit ? `<a class="btn btn-primary" href="/appointments/new?patientId=${patient.Id}" data-route="/appointments/new?patientId=${patient.Id}">حجز موعد</a>` : ''}</div></div></section><div class="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">${visibleTabs.map(([id, label], index) => `<button class="tab ${index === 0 ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div><div id="profile-tab-panel" class="mt-5"></div>`;
    outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
    outlet.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', async () => { outlet.querySelectorAll('[data-tab]').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); await renderTab(tab.dataset.tab, patient); }));
    await renderTab('overview', patient);
  } catch (error) {
    outlet.innerHTML = `<div class="card p-8 text-center"><h2 class="font-bold">Could not open patient profile</h2><p class="mt-2 text-sm text-slate-500">${escapeHtml(error.message)}</p></div>`;
  }
}
