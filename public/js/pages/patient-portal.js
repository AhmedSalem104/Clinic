import { api } from '../core/api-service.js';
import { escapeHtml, formatDate, formatDateTime, statusBadge, emptyState } from '../core/ui.js';

export async function render(outlet) {
  outlet.innerHTML = '<div class="py-16"><div class="skeleton h-8 w-1/3 mb-6"></div><div class="skeleton h-4 w-2/3"></div></div>';
  try {
    const result = await api.get('/patient-portal/summary');
    const patient = result.patient;
    const appointments = result.appointments || [];
    const rows = appointments.length ? appointments.map((appointment) => `<tr>
      <td class="font-semibold text-slate-800">${formatDateTime(appointment.StartAt)}</td>
      <td>${escapeHtml(appointment.DoctorName)}</td>
      <td>${escapeHtml(appointment.ServiceName)}</td>
      <td>${statusBadge(appointment.Status)}</td>
      <td>${appointment.QueueNumber ? `<a class="page-link text-xs" href="/queue-tracking.html?token=${encodeURIComponent(appointment.PublicTrackingToken || '')}">متابعة الدور #${escapeHtml(appointment.QueueNumber)}</a>` : '<span class="text-xs text-slate-400">لا يوجد طابور</span>'}</td>
    </tr>`).join('') : '';
    outlet.innerHTML = `<div class="section-heading"><div><h1>مواعيدي ومتابعة الدور</h1><p>مرحبًا ${escapeHtml(patient.FullName)}، هذه بياناتك التشغيلية فقط.</p></div></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <section class="card p-5"><div class="text-xs text-slate-500">Patient ID</div><div class="mt-2 text-lg font-bold text-blue-700">${escapeHtml(patient.PatientCode)}</div></section>
        <section class="card p-5"><div class="text-xs text-slate-500">الهاتف</div><div class="mt-2 text-lg font-bold text-slate-800" dir="ltr">${escapeHtml(patient.Phone)}</div></section>
        <section class="card p-5"><div class="text-xs text-slate-500">تاريخ الميلاد</div><div class="mt-2 text-lg font-bold text-slate-800">${formatDate(patient.DateOfBirth)}</div></section>
      </div>
      <section class="card mt-6"><div class="border-b border-slate-100 px-5 py-4"><h2 class="font-semibold text-slate-900">الحجوزات</h2><p class="mt-1 text-xs text-slate-500">يمكنك فتح رابط الدور عند توفر رقم الطابور.</p></div>
        <div class="table-wrap">${rows ? `<table class="data-table"><thead><tr><th>الموعد</th><th>الطبيب</th><th>الخدمة</th><th>الحالة</th><th>الدور</th></tr></thead><tbody>${rows}</tbody></table>` : emptyState('لا توجد حجوزات مسجلة حاليًا.')}</div>
      </section>`;
    const heading = outlet.querySelector('.section-heading');
    if (heading) {
      const bookingLink = document.createElement('a');
      bookingLink.className = 'btn btn-primary';
      bookingLink.href = '/appointments/new?source=patient';
      bookingLink.dataset.route = '/appointments/new?source=patient';
      bookingLink.textContent = 'Book a new appointment';
      bookingLink.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate('/appointments/new?source=patient'); });
      heading.append(bookingLink);
    }
  } catch (error) {
    outlet.innerHTML = `<div class="card p-8 text-center"><h2 class="text-lg font-bold">تعذر تحميل بيانات الحساب</h2><p class="mt-2 text-sm text-slate-500">${escapeHtml(error.message)}</p></div>`;
  }
}
