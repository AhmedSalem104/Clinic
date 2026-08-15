import { patientService } from '../services/patient-service.js';
import { clinicService } from '../services/clinic-service.js';
import { appointmentService } from '../services/appointment-service.js';
import { auth } from '../core/auth.js';
import { makeSlots } from '../utils/appointment-slots.mjs';
import { escapeHtml, debounce, loadingButton, toast, emptyState, localDateKey } from '../core/ui.js';

const localToIso = (value) => new Date(value).toISOString();
export async function render(outlet) {
  const query = new URLSearchParams(window.location.search);
  const currentUser = auth.user();
  const isPatientBooking = currentUser?.role === 'patient';
  const queryPatient = isPatientBooking ? String(currentUser.patientId || '') : (query.get('patientId') || '');
  const rescheduleId = isPatientBooking ? '' : (query.get('rescheduleId') || '');
  const requestedSource = isPatientBooking ? 'online' : (query.get('source') === 'walk_in' ? 'walk_in' : 'reception');
  const [doctors, services] = await Promise.all([
    clinicService.doctors({ page: 1, pageSize: 100 }),
    clinicService.services({ page: 1, pageSize: 100 })
  ]);
  const today = localDateKey();

  outlet.innerHTML = `<div class="section-heading"><div><h1>New booking</h1><p>Select the patient, doctor, service, date and an available slot.</p></div><a class="btn btn-secondary" href="/appointments" data-route="/appointments">Back to appointments</a></div><form id="appointment-form" class="card p-5"><div class="form-grid"><div class="span-2"><label class="form-label">Patient <span class="text-red-500">*</span></label><input id="patient-search-booking" class="input" placeholder="Search by name, phone or patient ID" autocomplete="off" /><input type="hidden" name="patientId" value="${escapeHtml(queryPatient)}" /><div id="patient-results" class="mt-2"></div><div id="selected-patient" class="mt-2"></div></div><div><label class="form-label">Doctor <span class="text-red-500">*</span></label><select class="select" name="doctorId" required><option value="">Select doctor</option>${(doctors.data || []).filter((doctor) => doctor.Status === 'active').map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)} · ${escapeHtml(doctor.Specialty || '')}</option>`).join('')}</select></div><div><label class="form-label">Service <span class="text-red-500">*</span></label><select class="select" name="serviceId" required><option value="">Select service</option>${(services.data || []).filter((service) => service.IsActive).map((service) => `<option value="${service.Id}" data-duration="${service.BaseDurationMinutes}">${escapeHtml(service.Name)} · ${service.BaseDurationMinutes} min</option>`).join('')}</select></div><div><label class="form-label">Date <span class="text-red-500">*</span></label><input class="input" name="date" type="date" min="${today}" value="${today}" required /></div><div><label class="form-label">Booking source</label><select class="select" name="bookingSource"><option value="reception" ${requestedSource === 'reception' ? 'selected' : ''}>Reception</option><option value="phone">Phone</option><option value="online">Online</option><option value="walk_in" ${requestedSource === 'walk_in' ? 'selected' : ''}>Walk-in</option></select></div><div class="span-2"><label class="form-label">Available slots</label><div id="available-slots" class="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">${emptyState('Select a doctor, service and date.')}</div><input type="hidden" name="startAt" required /></div><div class="span-2"><label class="form-label">Operational notes</label><textarea class="textarea" name="notes" maxlength="1000" placeholder="Do not enter diagnosis or sensitive clinical notes here."></textarea></div></div><div class="mt-6 flex justify-end"><button class="btn btn-primary" type="submit">Confirm booking</button></div></form>`;

  const form = document.querySelector('#appointment-form');
  const patientInput = document.querySelector('#patient-search-booking');
  const results = document.querySelector('#patient-results');
  let patientIdField = form.elements.namedItem('patientId');
  const startAtField = form.elements.namedItem('startAt');
  if (isPatientBooking) {
    if (!currentUser.patientId) throw new Error('This patient account is not linked to an active patient record.');
    const patientField = patientInput?.closest('.span-2');
    if (patientField) {
      patientField.innerHTML = `<label class="form-label">Patient</label><div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(currentUser.fullName)}</strong><span class="mx-2 text-blue-300">·</span>Your account</div><input type="hidden" name="patientId" value="${escapeHtml(currentUser.patientId)}" />`;
    }
    patientIdField = form.elements.namedItem('patientId');
    form.bookingSource.value = 'online';
    form.bookingSource.parentElement.classList.add('hidden');
    form.notes.closest('.span-2')?.classList.add('hidden');
    const heading = document.querySelector('.section-heading h1');
    const description = heading?.nextElementSibling;
    const backLink = document.querySelector('.section-heading a');
    if (heading) heading.textContent = 'Book a new appointment';
    if (description) description.textContent = 'Choose your doctor, service, date and an available slot.';
    if (backLink) { backLink.href = '/patient-portal'; backLink.dataset.route = '/patient-portal'; backLink.textContent = 'Back to my appointments'; }
  }
  const slotsBox = document.querySelector('#available-slots');
  if (slotsBox) {
    const priceBox = document.createElement('div');
    priceBox.id = 'booking-price';
    priceBox.className = 'mb-3';
    slotsBox.parentElement.insertBefore(priceBox, slotsBox);
  }
  const showSelected = async (id) => {
    if (!id) return;
    try {
      const patient = await patientService.get(id);
      document.querySelector('#selected-patient').innerHTML = `<div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-blue-300">·</span>${escapeHtml(patient.PatientCode)}<span class="mx-2 text-blue-300">·</span>${escapeHtml(patient.Phone)}</div>`;
    } catch (_) { /* keep the picker usable */ }
  };
  if (queryPatient && !isPatientBooking) await showSelected(queryPatient);
  if (rescheduleId) {
    const existing = await appointmentService.get(rescheduleId);
    patientIdField.value = existing.PatientId;
    form.doctorId.value = existing.DoctorId;
    form.serviceId.value = existing.ServiceId;
    form.date.value = localDateKey(existing.StartAt);
    form.bookingSource.value = existing.BookingSource || 'reception';
    form.dataset.rescheduleId = rescheduleId;
    await showSelected(existing.PatientId);
    document.querySelector('.section-heading h1').textContent = 'Reschedule appointment';
    form.querySelector('button[type=submit]').textContent = 'Save reschedule';
  }

  if (!isPatientBooking) patientInput.addEventListener('input', debounce(async () => {
    const search = patientInput.value.trim();
    if (search.length < 2) { results.innerHTML = ''; return; }
    try {
      const response = await patientService.list({ search, page: 1, pageSize: 8 });
      results.innerHTML = (response.data || []).map((patient) => `<button type="button" class="block w-full rounded-lg border-b border-slate-100 p-3 text-right text-sm hover:bg-slate-50" data-patient-id="${patient.Id}"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-xs text-slate-400">${escapeHtml(patient.PatientCode)} · ${escapeHtml(patient.Phone)}</span></button>`).join('') || '<div class="p-3 text-xs text-slate-500">No patients found.</div>';
      results.querySelectorAll('[data-patient-id]').forEach((button) => button.addEventListener('click', () => {
        patientIdField.value = button.dataset.patientId;
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
    const priceBox = document.querySelector('#booking-price');
    startAtField.value = '';
    if (!doctorId || !serviceId || !date) { box.innerHTML = emptyState('Select a doctor, service and date.'); if (priceBox) priceBox.innerHTML = ''; return; }
    box.innerHTML = '<div class="text-xs text-slate-500">Loading available slots…</div>';
    try {
      const response = await appointmentService.slots({ doctorId, serviceId, date });
      if (priceBox) priceBox.innerHTML = response.service?.Price !== undefined ? `<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">Price: <strong class="text-slate-900">${Number(response.service.Price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>` : '';
      const slots = makeSlots(response.schedules?.[0], response.booked || [], Number(response.service?.BaseDurationMinutes || 15), date, response.pauses || [], response.exceptions || []);
      box.innerHTML = slots.length ? slots.map((slot) => `<button type="button" class="btn btn-secondary" data-slot="${slot.toISOString()}">${slot.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</button>`).join('') : emptyState('No slots are available for this date.');
      box.querySelectorAll('[data-slot]').forEach((button) => button.addEventListener('click', () => {
        box.querySelectorAll('[data-slot]').forEach((item) => item.classList.remove('!bg-blue-600', '!text-white'));
        button.classList.add('!bg-blue-600', '!text-white');
        startAtField.value = button.dataset.slot;
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
    const patientId = isPatientBooking ? Number(currentUser?.patientId) : Number(patientIdField?.value);
    const selectedStartAt = startAtField?.value || '';
    if (!patientId || !selectedStartAt) {
      const missingMessage = !patientId ? 'Your patient account is not linked correctly.' : 'Select an available slot before confirming the booking.';
      window.Swal.fire({ icon: 'warning', title: 'Missing booking data', text: missingMessage });
      return;
    }
    const button = form.querySelector('button[type=submit]');
    loadingButton(button, true);
    try {
      let appointment;
      if (form.dataset.rescheduleId) appointment = await appointmentService.reschedule(form.dataset.rescheduleId, { startAt: localToIso(selectedStartAt) });
      else appointment = await appointmentService.create({ patientId, doctorId: Number(form.doctorId.value), serviceId: Number(form.serviceId.value), bookingSource: form.bookingSource.value, startAt: localToIso(selectedStartAt), notes: form.notes.value || null });
      if (isPatientBooking && appointment) {
        const trackingUrl = appointment.PublicTrackingToken ? `${window.location.origin}/queue-tracking.html?token=${encodeURIComponent(appointment.PublicTrackingToken)}` : null;
        await window.Swal.fire({ icon: 'success', title: 'Booking confirmed', text: `Appointment #${appointment.Id} has been created.${trackingUrl ? ' You can follow your queue from the link in your appointments.' : ''}`, confirmButtonText: 'View my appointments' });
      }
      toast(form.dataset.rescheduleId ? 'Appointment rescheduled' : 'Booking confirmed');
      window.clinicApp.navigate(isPatientBooking ? '/patient-portal' : '/appointments');
    } catch (error) {
      if (['OVERLAPPING_BOOKING', 'DOUBLE_BOOKING', 'DOCTOR_PAUSED', 'SCHEDULE_UNAVAILABLE'].includes(error.code)) {
        startAtField.value = '';
        await updateSlots();
      }
      window.Swal.fire({ icon: 'error', title: error.code === 'OVERLAPPING_BOOKING' ? 'Selected slot is no longer available' : 'Booking could not be created', text: error.message });
    } finally { loadingButton(button, false); }
  });
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  await updateSlots();
}
