import { patientService } from '../services/patient-service.js';
import { clinicService } from '../services/clinic-service.js';
import { appointmentService } from '../services/appointment-service.js';
import { auth } from '../core/auth.js';
import { makeSlots } from '../utils/appointment-slots.mjs';
import { escapeHtml, debounce, loadingButton, toast, emptyState, localDateKey } from '../core/ui.js';
import { bookingErrorText, showBookingError } from '../core/booking-messages.js';

const localToIso = (value) => new Date(value).toISOString();
const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function render(outlet) {
  const query = new URLSearchParams(window.location.search);
  const currentUser = auth.user();
  const currentRole = String(currentUser?.role || '').trim().toLowerCase();
  const isPatientBooking = currentRole === 'patient';
  const queryPatient = isPatientBooking ? String(currentUser.patientId || '') : (query.get('patientId') || '');
  let selectedPatientId = positiveId(queryPatient);
  const rescheduleId = isPatientBooking ? '' : (query.get('rescheduleId') || '');
  const requestedSource = isPatientBooking ? 'online' : (query.get('source') === 'walk_in' ? 'walk_in' : 'reception');
  const [doctors, services] = await Promise.all([
    clinicService.doctors({ page: 1, pageSize: 100 }),
    clinicService.services({ page: 1, pageSize: 100 })
  ]);
  const today = localDateKey();
  const activeDoctors = (doctors.data || []).filter((doctor) => doctor.Status === 'active');
  const requestedDoctor = query.get('doctorId') || (currentRole === 'doctor' ? String(currentUser.doctorId || '') : activeDoctors.length === 1 ? String(activeDoctors[0].Id) : '');

  outlet.innerHTML = `<div class="section-heading"><div><h1>حجز جديد</h1><p>ثلاثة اختيارات فقط: المريضة، الموعد، ثم التأكيد.</p></div><a class="btn btn-secondary" href="/appointments" data-route="/appointments">العودة إلى الحجوزات</a></div><form id="appointment-form" class="card p-5 booking-staff-form"><div class="staff-booking-progress" aria-label="مراحل الحجز"><span data-booking-step="patient"><b>01</b> المريضة</span><i></i><span data-booking-step="slot"><b>02</b> الموعد</span><i></i><span data-booking-step="confirm"><b>03</b> التأكيد</span></div><div class="form-grid"><div class="span-2"><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><label class="form-label mb-0">المريضة <span class="text-red-500">*</span></label><button id="open-quick-patient" class="btn btn-secondary text-xs" type="button">+ إضافة مريضة جديدة</button></div><input id="patient-search-booking" class="input" placeholder="ابحثي بالاسم أو الهاتف أو معرّف المريضة" autocomplete="off" /><input type="hidden" name="patientId" value="${escapeHtml(queryPatient)}" /><div id="patient-results" class="mt-2"></div><div id="selected-patient" class="mt-2"></div><div id="quick-patient-panel" class="mt-3 hidden rounded-xl border border-blue-100 bg-blue-50 p-4"><div class="mb-3"><strong class="text-sm text-blue-950">إضافة مريضة سريعة</strong><p class="mt-1 text-xs text-blue-800">الاسم والهاتف يكفيان للحجز، ويستكمل الريسبشن الملف لاحقًا.</p></div><div class="form-grid"><div><label class="form-label">الاسم الكامل <span class="text-red-500">*</span></label><input id="quick-patient-name" class="input bg-white" maxlength="180" /></div><div><label class="form-label">رقم الهاتف <span class="text-red-500">*</span></label><input id="quick-patient-phone" class="input bg-white" inputmode="tel" maxlength="40" /></div><div><label class="form-label">تاريخ الميلاد <span class="text-slate-500">اختياري</span></label><input id="quick-patient-dob" class="input bg-white" type="date" /></div></div><div class="mt-4 flex justify-end gap-2"><button id="cancel-quick-patient" class="btn btn-secondary text-xs" type="button">إلغاء</button><button id="save-quick-patient" class="btn btn-primary text-xs" type="button">حفظ واختيار المريضة</button></div></div><p class="mt-2 text-xs text-slate-500">اختاري نتيجة البحث لتثبيت الملف، أو أضيفي مريضة جديدة بسرعة.</p></div><div><label class="form-label">الطبيب <span class="text-red-500">*</span></label><select class="select" name="doctorId" required><option value="">اختاري الطبيب</option>${activeDoctors.map((doctor) => `<option value="${doctor.Id}" ${String(doctor.Id) === String(requestedDoctor) ? 'selected' : ''}>${escapeHtml(doctor.FullName)} · ${escapeHtml(doctor.Specialty || '')}</option>`).join('')}</select></div><div><label class="form-label">الخدمة <span class="text-red-500">*</span></label><select class="select" name="serviceId" required><option value="">اختاري الخدمة</option>${(services.data || []).filter((service) => service.IsActive).map((service) => `<option value="${service.Id}" data-duration="${service.BaseDurationMinutes}">${escapeHtml(service.Name)} · ${service.BaseDurationMinutes} دقيقة</option>`).join('')}</select></div><div><label class="form-label">التاريخ <span class="text-red-500">*</span></label><input class="input" name="date" type="date" min="${today}" value="${today}" required /></div><div><label class="form-label">مصدر الحجز</label><select class="select" name="bookingSource"><option value="reception" ${requestedSource === 'reception' ? 'selected' : ''}>الريسبشن</option><option value="phone">هاتف</option><option value="online">إلكتروني</option><option value="walk_in" ${requestedSource === 'walk_in' ? 'selected' : ''}>بدون موعد</option></select></div><div class="span-2"><label class="form-label">المواعيد المتاحة</label><div id="available-slots" class="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">${emptyState('اختاري الطبيب والخدمة والتاريخ.')}</div><input type="hidden" name="startAt" required /></div><div class="span-2"><label class="form-label">ملاحظات تشغيلية <span class="text-slate-500">اختياري</span></label><textarea class="textarea" name="notes" maxlength="1000" placeholder="لا تكتبي تشخيصًا أو ملاحظات طبية حساسة هنا."></textarea></div></div><div id="booking-flow-state" class="staff-booking-state">ابدئي بالبحث عن المريضة. بعد اختيار الطبيب والخدمة سيظهر الموعد المتاح تلقائيًا.</div><div class="mt-4 flex justify-end"><button class="btn btn-primary" type="submit">تأكيد الحجز</button></div></form>`;

  const form = document.querySelector('#appointment-form');
  const patientInput = document.querySelector('#patient-search-booking');
  const results = document.querySelector('#patient-results');
  let patientIdField = form.elements.namedItem('patientId');
  const startAtField = form.elements.namedItem('startAt');
  const refreshFlowState = () => {
    const hasPatient = Boolean(patientIdField?.value || selectedPatientId);
    const hasSlot = Boolean(form.elements.startAt?.value);
    const hasBookingData = Boolean(form.elements.doctorId?.value && form.elements.serviceId?.value && form.elements.date?.value);
    document.querySelector('[data-booking-step="patient"]')?.classList.toggle('is-complete', hasPatient);
    document.querySelector('[data-booking-step="slot"]')?.classList.toggle('is-complete', hasSlot);
    document.querySelector('[data-booking-step="slot"]')?.classList.toggle('is-active', hasPatient && !hasSlot);
    document.querySelector('[data-booking-step="confirm"]')?.classList.toggle('is-active', hasPatient && hasBookingData && hasSlot);
    const state = document.querySelector('#booking-flow-state');
    if (!state) return;
    state.textContent = !hasPatient ? 'ابدئي بالبحث عن المريضة أو أضيفي سجلًا سريعًا.' : !hasBookingData ? 'اختاري الطبيب والخدمة والتاريخ لعرض المواعيد.' : !hasSlot ? 'اختاري موعدًا متاحًا من القائمة ثم أكّدي الحجز.' : 'كل البيانات الأساسية مكتملة. راجعي الاختيار ثم اضغطي تأكيد الحجز.';
  };
  if (isPatientBooking) {
    if (!currentUser.patientId) throw new Error('This patient account is not linked to an active patient record.');
    const patientField = patientInput?.closest('.span-2');
    if (patientField) {
      patientField.innerHTML = `<label class="form-label">المريضة</label><div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(currentUser.fullName)}</strong><span class="mx-2 text-blue-300">·</span>حسابك</div><input type="hidden" name="patientId" value="${escapeHtml(currentUser.patientId)}" />`;
    }
    patientIdField = form.elements.namedItem('patientId');
    selectedPatientId = positiveId(currentUser.patientId);
    form.bookingSource.value = 'online';
    form.bookingSource.parentElement.classList.add('hidden');
    form.notes.closest('.span-2')?.classList.add('hidden');
    const heading = document.querySelector('.section-heading h1');
    const description = heading?.nextElementSibling;
    const backLink = document.querySelector('.section-heading a');
    if (heading) heading.textContent = 'حجز موعد جديد';
    if (description) description.textContent = 'اختاري الطبيب والخدمة والتاريخ والموعد المتاح.';
    if (backLink) { backLink.href = '/patient-portal'; backLink.dataset.route = '/patient-portal'; backLink.textContent = 'العودة إلى مواعيدي'; }
  }
  const slotsBox = document.querySelector('#available-slots');
  if (slotsBox) {
    const priceBox = document.createElement('div');
    priceBox.id = 'booking-price';
    priceBox.className = 'mb-3';
    slotsBox.parentElement.insertBefore(priceBox, slotsBox);
  }
  const renderSelectedPatient = (patient) => {
    const selectedBox = document.querySelector('#selected-patient');
    if (!selectedBox || !patient) return;
    selectedBox.innerHTML = `<div class="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><span><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-blue-300">·</span>${escapeHtml(patient.PatientCode || '')}<span class="mx-2 text-blue-300">·</span>${escapeHtml(patient.Phone || '')}</span><button id="clear-selected-patient" class="text-xs font-semibold text-blue-700 hover:text-blue-950" type="button">تغيير</button></div>`;
    selectedBox.querySelector('#clear-selected-patient')?.addEventListener('click', () => {
      selectedPatientId = null;
      patientIdField.value = '';
      form.dataset.patientId = '';
      selectedBox.innerHTML = '';
      refreshFlowState();
      patientInput?.focus();
    });
  };

  const selectPatient = (patient) => {
    const normalizedId = positiveId(patient?.Id || patient);
    if (!normalizedId) return false;
    selectedPatientId = normalizedId;
    patientIdField.value = String(normalizedId);
    form.dataset.patientId = String(normalizedId);
    if (typeof patient === 'object') renderSelectedPatient(patient);
    refreshFlowState();
    return true;
  };

  const showSelected = async (id) => {
    const normalizedId = positiveId(id);
    if (!normalizedId) return;
    try {
      const patient = await patientService.get(normalizedId);
      selectPatient(patient);
    } catch (_) { /* keep the picker usable */ }
  };
  if (queryPatient && !isPatientBooking) await showSelected(queryPatient);
  if (rescheduleId) {
    const existing = await appointmentService.get(rescheduleId);
    selectedPatientId = positiveId(existing.PatientId);
    patientIdField.value = selectedPatientId || '';
    form.doctorId.value = existing.DoctorId;
    form.serviceId.value = existing.ServiceId;
    form.date.value = localDateKey(existing.StartAt);
    form.bookingSource.value = existing.BookingSource || 'reception';
    form.dataset.rescheduleId = rescheduleId;
    await showSelected(existing.PatientId);
    document.querySelector('.section-heading h1').textContent = 'إعادة جدولة الموعد';
    form.querySelector('button[type=submit]').textContent = 'حفظ إعادة الجدولة';
  }

  const quickPatientPanel = document.querySelector('#quick-patient-panel');
  const openQuickPatient = () => {
    quickPatientPanel?.classList.remove('hidden');
    document.querySelector('#quick-patient-name')?.focus();
  };
  document.querySelector('#open-quick-patient')?.addEventListener('click', openQuickPatient);
  document.querySelector('#cancel-quick-patient')?.addEventListener('click', () => quickPatientPanel?.classList.add('hidden'));
  document.querySelector('#quick-patient-from-results')?.addEventListener('click', openQuickPatient);

  document.querySelector('#save-quick-patient')?.addEventListener('click', async () => {
    const nameField = document.querySelector('#quick-patient-name');
    const phoneField = document.querySelector('#quick-patient-phone');
    const dobField = document.querySelector('#quick-patient-dob');
    const saveButton = document.querySelector('#save-quick-patient');
    const fullName = nameField?.value.trim() || '';
    const phone = phoneField?.value.trim() || '';
    if (fullName.length < 2 || phone.length < 5) {
      window.Swal.fire({ icon: 'warning', title: 'بيانات المريضة ناقصة', text: 'أدخلي الاسم الكامل ورقم هاتف صحيح.' });
      return;
    }
    loadingButton(saveButton, true);
    try {
      const patient = await patientService.create({ fullName, phone, dateOfBirth: dobField?.value || null, profileStatus: 'incomplete' });
      selectPatient(patient);
      quickPatientPanel?.classList.add('hidden');
      nameField.value = '';
      phoneField.value = '';
      if (dobField) dobField.value = '';
      toast('تم إنشاء المريضة واختيارها للحجز');
    } catch (error) {
      if (error.code === 'POTENTIAL_DUPLICATE' && error.details?.matches?.length) {
        const match = error.details.matches[0];
        const result = await window.Swal.fire({
          icon: 'warning',
          title: 'يوجد سجل مشابه',
          html: `<p class="text-sm text-slate-600">${escapeHtml(match.FullName)} · ${escapeHtml(match.PatientCode)} · ${escapeHtml(match.Phone)}</p>`,
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'استخدام السجل الموجود',
          denyButtonText: 'إنشاء سجل جديد',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#2563eb',
          denyButtonColor: '#64748b'
        });
        if (result.isConfirmed) {
          selectPatient(match);
          quickPatientPanel?.classList.add('hidden');
        } else if (result.isDenied) {
          try {
            const patient = await patientService.create({ fullName, phone, dateOfBirth: dobField?.value || null, profileStatus: 'incomplete', confirmDuplicate: true });
            selectPatient(patient);
            quickPatientPanel?.classList.add('hidden');
            toast('تم إنشاء المريضة واختيارها للحجز');
          } catch (retryError) {
            window.Swal.fire({ icon: 'error', title: 'تعذر حفظ المريضة', text: retryError.message });
          }
        }
      } else {
        window.Swal.fire({ icon: 'error', title: 'تعذر إضافة المريضة', text: error.message });
      }
    } finally { loadingButton(saveButton, false); }
  });

  if (!isPatientBooking) patientInput.addEventListener('input', debounce(async () => {
    const search = patientInput.value.trim();
    selectedPatientId = null;
    patientIdField.value = '';
    form.dataset.patientId = '';
    document.querySelector('#selected-patient').innerHTML = '';
    if (search.length < 2) { results.innerHTML = ''; return; }
    try {
      const response = await patientService.list({ search, page: 1, pageSize: 8 });
      results.innerHTML = (response.data || []).map((patient) => `<button type="button" class="block w-full rounded-lg border-b border-slate-100 p-3 text-right text-sm hover:bg-slate-50" data-patient-id="${patient.Id}"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-xs text-slate-400">${escapeHtml(patient.PatientCode)} · ${escapeHtml(patient.Phone)}</span></button>`).join('') || '<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">لا توجد مريضة بهذا البحث. <button id="quick-patient-from-results" type="button" class="font-semibold text-blue-700">إضافة مريضة جديدة</button></div>';
      results.querySelector('#quick-patient-from-results')?.addEventListener('click', openQuickPatient);
      results.querySelectorAll('[data-patient-id]').forEach((button) => button.addEventListener('click', () => {
        selectPatient({ Id: button.dataset.patientId, FullName: button.querySelector('strong')?.textContent || '', PatientCode: button.querySelector('span')?.textContent?.split('·')[0]?.trim() || '', Phone: button.querySelector('span')?.textContent?.split('·').slice(-1)[0]?.trim() || '' });
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
    if (!doctorId || !serviceId || !date) { box.innerHTML = emptyState('اختاري الطبيب والخدمة والتاريخ.'); if (priceBox) priceBox.innerHTML = ''; return; }
    box.innerHTML = '<div class="text-xs text-slate-500">جاري تحميل المواعيد المتاحة…</div>';
    try {
      const response = await appointmentService.slots({ doctorId, serviceId, date });
      if (priceBox) priceBox.innerHTML = response.service?.Price !== undefined ? `<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">السعر: <strong class="text-slate-900">${Number(response.service.Price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</strong></div>` : '';
      const slots = makeSlots(response.schedules?.[0], response.booked || [], Number(response.service?.BaseDurationMinutes || 15), date, response.pauses || [], response.exceptions || []);
      box.innerHTML = slots.length ? slots.map((slot) => `<button type="button" class="btn btn-secondary" data-slot="${slot.toISOString()}">${slot.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</button>`).join('') : emptyState('لا توجد مواعيد متاحة في هذا التاريخ.');
      box.querySelectorAll('[data-slot]').forEach((button) => button.addEventListener('click', () => {
        box.querySelectorAll('[data-slot]').forEach((item) => item.classList.remove('!bg-blue-600', '!text-white'));
        button.classList.add('!bg-blue-600', '!text-white');
        startAtField.value = button.dataset.slot;
        refreshFlowState();
      }));
    } catch (error) {
      box.innerHTML = `<div class="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">${escapeHtml(bookingErrorText(error))}</div>`;
    }
  };

  form.doctorId.addEventListener('change', () => { refreshFlowState(); updateSlots(); });
  form.serviceId.addEventListener('change', () => { refreshFlowState(); updateSlots(); });
  form.date.addEventListener('change', () => { refreshFlowState(); updateSlots(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const patientId = isPatientBooking ? positiveId(currentUser?.patientId) : (positiveId(form.dataset.patientId) || selectedPatientId || positiveId(patientIdField?.value));
    const selectedStartAt = startAtField?.value || '';
    if (!patientId || !selectedStartAt) {
      const missingMessage = !patientId
        ? (isPatientBooking ? 'حساب المريضة غير مرتبط بشكل صحيح. سجّلي الدخول بحساب مريضة مرتبط أو استخدمي الحجز العام.' : 'ابحثي عن المريضة ثم اختاريها من نتائج البحث قبل تأكيد الحجز.')
        : 'اختاري موعدًا متاحًا قبل تأكيد الحجز.';
      window.Swal.fire({ icon: 'warning', title: 'بيانات الحجز ناقصة', text: missingMessage });
      if (!patientId && !isPatientBooking) patientInput?.focus();
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
        await window.Swal.fire({ icon: 'success', title: 'تم تأكيد الحجز', text: `تم إنشاء الموعد رقم #${appointment.Id}.${trackingUrl ? ' يمكنك متابعة دورك من رابط المتابعة في مواعيدك.' : ''}`, confirmButtonText: 'عرض مواعيدي' });
      }
      toast(form.dataset.rescheduleId ? 'تمت إعادة جدولة الموعد' : 'تم تأكيد الحجز');
      window.clinicApp.navigate(isPatientBooking ? '/patient-portal' : '/appointments');
    } catch (error) {
      if (['OVERLAPPING_BOOKING', 'DOUBLE_BOOKING', 'DOCTOR_PAUSED', 'SCHEDULE_UNAVAILABLE'].includes(error.code)) {
        startAtField.value = '';
        await updateSlots();
      }
      showBookingError(error);
    } finally { loadingButton(button, false); }
  });
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
  await updateSlots();
  refreshFlowState();
  if (!isPatientBooking && !queryPatient && !rescheduleId) patientInput?.focus();
}
