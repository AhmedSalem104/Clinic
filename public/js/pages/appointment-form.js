import { patientService } from '../services/patient-service.js';
import { clinicService } from '../services/clinic-service.js';
import { appointmentService } from '../services/appointment-service.js';
import { escapeHtml, debounce, loadingButton, toast, emptyState, localDateKey } from '../core/ui.js';

const localToIso = (value) => new Date(value).toISOString();
const clockMinutes = (value) => {
  const [hours = 0, minutes = 0] = String(value || '0:0').split(':').map(Number);
  return hours * 60 + minutes;
};
const parseBreaks = (value) => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const makeSlots = (schedule, booked, duration, date, pauses = [], exceptions = []) => {
  if (!schedule || exceptions.some((item) => ['vacation', 'unavailable'].includes(item.ExceptionType))) return [];
  const special = exceptions.find((item) => item.ExceptionType === 'special' && item.StartTime && item.EndTime);
  const startMinute = clockMinutes(special?.StartTime || schedule.StartTime);
  const endMinute = clockMinutes(special?.EndTime || schedule.EndTime);
  const breaks = parseBreaks(schedule.BreaksJson);
  const dayStart = new Date(`${date}T00:00:00`);
  const output = [];

  for (let minute = startMinute; minute + duration <= endMinute; minute += duration) {
    const start = new Date(dayStart.getTime() + minute * 60000);
    const end = new Date(start.getTime() + duration * 60000);
    const overlapsBooking = booked.some((booking) => {
      const bookingStart = new Date(booking.StartAt).getTime();
      const bookingEnd = bookingStart + Number(booking.ExpectedDurationMinutes || duration) * 60000;
      return start.getTime() < bookingEnd && end.getTime() > bookingStart;
    });
    const overlapsBreak = breaks.some((item) => {
      const breakStart = clockMinutes(item.start || item.StartTime || item.from);
      const breakEnd = clockMinutes(item.end || item.EndTime || item.to);
      return minute < breakEnd && minute + duration > breakStart;
    });
    const overlapsPause = pauses.some((pause) => start.getTime() < new Date(pause.EndAt).getTime() && end.getTime() > new Date(pause.StartedAt).getTime());
    if (!overlapsBooking && !overlapsBreak && !overlapsPause) output.push(start);
  }
  return output;
};

export async function render(outlet) {
  const query = new URLSearchParams(window.location.search);
  const queryPatient = query.get('patientId') || '';
  const rescheduleId = query.get('rescheduleId') || '';
  const requestedSource = query.get('source') === 'walk_in' ? 'walk_in' : 'reception';
  const [doctors, services] = await Promise.all([
    clinicService.doctors({ page: 1, pageSize: 100 }),
    clinicService.services({ page: 1, pageSize: 100 })
  ]);
  const today = localDateKey();

  outlet.innerHTML = `<div class="section-heading"><div><h1>New booking</h1><p>Select the patient, doctor, service, date and an available slot.</p></div><a class="btn btn-secondary" href="/appointments" data-route="/appointments">Back to appointments</a></div><form id="appointment-form" class="card p-5"><div class="form-grid"><div class="span-2"><label class="form-label">Patient <span class="text-red-500">*</span></label><input id="patient-search-booking" class="input" placeholder="Search by name, phone or patient ID" autocomplete="off" /><input type="hidden" name="patientId" value="${escapeHtml(queryPatient)}" /><div id="patient-results" class="mt-2"></div><div id="selected-patient" class="mt-2"></div></div><div><label class="form-label">Doctor <span class="text-red-500">*</span></label><select class="select" name="doctorId" required><option value="">Select doctor</option>${(doctors.data || []).filter((doctor) => doctor.Status === 'active').map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)} · ${escapeHtml(doctor.Specialty || '')}</option>`).join('')}</select></div><div><label class="form-label">Service <span class="text-red-500">*</span></label><select class="select" name="serviceId" required><option value="">Select service</option>${(services.data || []).filter((service) => service.IsActive).map((service) => `<option value="${service.Id}" data-duration="${service.BaseDurationMinutes}">${escapeHtml(service.Name)} · ${service.BaseDurationMinutes} min</option>`).join('')}</select></div><div><label class="form-label">Date <span class="text-red-500">*</span></label><input class="input" name="date" type="date" min="${today}" value="${today}" required /></div><div><label class="form-label">Booking source</label><select class="select" name="bookingSource"><option value="reception" ${requestedSource === 'reception' ? 'selected' : ''}>Reception</option><option value="phone">Phone</option><option value="online">Online</option><option value="walk_in" ${requestedSource === 'walk_in' ? 'selected' : ''}>Walk-in</option></select></div><div class="span-2"><label class="form-label">Available slots</label><div id="available-slots" class="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">${emptyState('Select a doctor, service and date.')}</div><input type="hidden" name="startAt" required /></div><div class="span-2"><label class="form-label">Operational notes</label><textarea class="textarea" name="notes" maxlength="1000" placeholder="Do not enter diagnosis or sensitive clinical notes here."></textarea></div></div><div class="mt-6 flex justify-end"><button class="btn btn-primary" type="submit">Confirm booking</button></div></form>`;

  const form = document.querySelector('#appointment-form');
  const patientInput = document.querySelector('#patient-search-booking');
  const results = document.querySelector('#patient-results');
  const showSelected = async (id) => {
    if (!id) return;
    try {
      const patient = await patientService.get(id);
      document.querySelector('#selected-patient').innerHTML = `<div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-blue-300">·</span>${escapeHtml(patient.PatientCode)}<span class="mx-2 text-blue-300">·</span>${escapeHtml(patient.Phone)}</div>`;
    } catch (_) { /* keep the picker usable */ }
  };
  if (queryPatient) await showSelected(queryPatient);
  if (rescheduleId) {
    const existing = await appointmentService.get(rescheduleId);
    form.patientId.value = existing.PatientId;
    form.doctorId.value = existing.DoctorId;
    form.serviceId.value = existing.ServiceId;
    form.date.value = localDateKey(existing.StartAt);
    form.bookingSource.value = existing.BookingSource || 'reception';
    form.dataset.rescheduleId = rescheduleId;
    await showSelected(existing.PatientId);
    document.querySelector('.section-heading h1').textContent = 'Reschedule appointment';
    form.querySelector('button[type=submit]').textContent = 'Save reschedule';
  }

  patientInput.addEventListener('input', debounce(async () => {
    const search = patientInput.value.trim();
    if (search.length < 2) { results.innerHTML = ''; return; }
    try {
      const response = await patientService.list({ search, page: 1, pageSize: 8 });
      results.innerHTML = (response.data || []).map((patient) => `<button type="button" class="block w-full rounded-lg border-b border-slate-100 p-3 text-right text-sm hover:bg-slate-50" data-patient-id="${patient.Id}"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-xs text-slate-400">${escapeHtml(patient.PatientCode)} · ${escapeHtml(patient.Phone)}</span></button>`).join('') || '<div class="p-3 text-xs text-slate-500">No patients found.</div>';
      results.querySelectorAll('[data-patient-id]').forEach((button) => button.addEventListener('click', () => {
        form.patientId.value = button.dataset.patientId;
        patientInput.value = '';
        results.innerHTML = '';
        showSelected(button.dataset.patientId);
      }));
    } catch (error) {
      results.innerHTML = `<div class="p-3 text-xs text-red-600">${escapeHtml(error.message)}</div>`;
    }
  }, 350));

  const updateSlots = async () => {
    const doctorId = form.doctorId.value;
    const serviceId = form.serviceId.value;
    const date = form.date.value;
    const box = document.querySelector('#available-slots');
    form.startAt.value = '';
    if (!doctorId || !serviceId || !date) { box.innerHTML = emptyState('Select a doctor, service and date.'); return; }
    box.innerHTML = '<div class="text-xs text-slate-500">Loading available slots…</div>';
    try {
      const response = await appointmentService.slots({ doctorId, serviceId, date });
      const slots = makeSlots(response.schedules?.[0], response.booked || [], Number(response.service?.BaseDurationMinutes || 15), date, response.pauses || [], response.exceptions || []);
      box.innerHTML = slots.length ? slots.map((slot) => `<button type="button" class="btn btn-secondary" data-slot="${slot.toISOString()}">${slot.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</button>`).join('') : emptyState('No slots are available for this date.');
      box.querySelectorAll('[data-slot]').forEach((button) => button.addEventListener('click', () => {
        box.querySelectorAll('[data-slot]').forEach((item) => item.classList.remove('!bg-blue-600', '!text-white'));
        button.classList.add('!bg-blue-600', '!text-white');
        form.startAt.value = button.dataset.slot;
      }));
    } catch (error) {
      box.innerHTML = `<div class="text-xs text-red-600">${escapeHtml(error.message)}</div>`;
    }
  };

  form.doctorId.addEventListener('change', updateSlots);
  form.serviceId.addEventListener('change', updateSlots);
  form.date.addEventListener('change', updateSlots);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.patientId.value || !form.startAt.value) {
      window.Swal.fire({ icon: 'warning', title: 'Missing booking data', text: 'Select a patient and an available slot.' });
      return;
    }
    const button = form.querySelector('button[type=submit]');
    loadingButton(button, true);
    try {
      if (form.dataset.rescheduleId) await appointmentService.reschedule(form.dataset.rescheduleId, { startAt: localToIso(form.startAt.value) });
      else await appointmentService.create({ patientId: Number(form.patientId.value), doctorId: Number(form.doctorId.value), serviceId: Number(form.serviceId.value), bookingSource: form.bookingSource.value, startAt: localToIso(form.startAt.value), notes: form.notes.value || null });
      toast(form.dataset.rescheduleId ? 'Appointment rescheduled' : 'Booking confirmed');
      window.clinicApp.navigate('/appointments');
    } catch (error) {
      window.Swal.fire({ icon: 'error', title: 'Booking could not be created', text: error.message });
    } finally { loadingButton(button, false); }
  });
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  await updateSlots();
}
