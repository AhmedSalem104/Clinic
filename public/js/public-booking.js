import { publicBookingService } from './services/public-booking-service.js';
import { makeSlots } from './utils/appointment-slots.mjs';
import { escapeHtml, formatMoney, localDateKey, loadingButton } from './core/ui.js';

const form = document.querySelector('#public-booking-form');
const doctorField = form?.elements.doctorId;
const serviceField = form?.elements.serviceId;
const dateField = form?.elements.date;
const slotField = form?.elements.startAt;
const slotsBox = document.querySelector('#available-slots');
const priceBox = document.querySelector('#price-box');
const statusBox = document.querySelector('#booking-status');

const showStatus = (message, kind = 'error') => {
  statusBox.textContent = message;
  statusBox.className = `mb-5 rounded-lg border p-3 text-sm ${kind === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`;
  statusBox.classList.remove('hidden');
};

const formatDateTime = (value) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
const formatSlot = (value) => new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(value);

const renderConfirmation = (booking) => {
  const trackingUrl = booking.publicTrackingToken && booking.requiresQueue ? `/queue-tracking.html?token=${encodeURIComponent(booking.publicTrackingToken)}` : '';
  const accountUrl = `/patient-register.html?patientCode=${encodeURIComponent(booking.patientCode)}`;
  document.querySelector('#booking-shell').classList.add('hidden');
  const confirmation = document.querySelector('#booking-confirmation');
  confirmation.className = 'card mx-auto max-w-2xl overflow-hidden';
  confirmation.innerHTML = `<div class="border-b border-green-100 bg-green-50 px-5 py-7 text-center sm:px-8"><div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-600 text-2xl font-bold text-white">✓</div><h1 class="mt-4 text-2xl font-bold text-slate-900">تم تأكيد الحجز</h1><p class="mt-2 text-sm text-slate-600">احتفظي بهذه البيانات لإعطائها للريسبشن عند الوصول.</p></div><div class="grid gap-3 p-5 sm:grid-cols-2 sm:p-8"><div class="rounded-xl bg-blue-50 p-4"><div class="text-xs text-blue-700">معرّف المريضة</div><div class="mt-1 text-lg font-bold text-blue-900" dir="ltr">${escapeHtml(booking.patientCode)}</div></div><div class="rounded-xl bg-blue-50 p-4"><div class="text-xs text-blue-700">رقم الحجز</div><div class="mt-1 text-lg font-bold text-blue-900" dir="ltr">#${escapeHtml(booking.appointmentId)}</div></div>${booking.queueNumber ? `<div class="rounded-xl bg-slate-50 p-4"><div class="text-xs text-slate-500">رقم الدور</div><div class="mt-1 text-2xl font-bold text-blue-700">#${escapeHtml(booking.queueNumber)}</div></div>` : ''}<div class="rounded-xl bg-slate-50 p-4"><div class="text-xs text-slate-500">السعر</div><div class="mt-1 text-lg font-bold text-slate-900">${formatMoney(booking.price)}</div></div><div class="rounded-xl border border-slate-200 p-4 sm:col-span-2"><div class="text-xs text-slate-500">تفاصيل الموعد</div><div class="mt-2 text-sm font-semibold text-slate-900">${escapeHtml(booking.doctorName)} · ${escapeHtml(booking.serviceName)}</div><div class="mt-1 text-sm text-slate-600">${escapeHtml(formatDateTime(booking.startAt))}</div></div></div><div class="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:flex-wrap sm:p-8">${trackingUrl ? `<a class="btn btn-primary flex-1" href="${trackingUrl}">متابعة الدور والوقت المتوقع</a>` : ''}<a class="btn btn-secondary flex-1" href="${accountUrl}">إنشاء حساب لاحقًا</a><a class="btn btn-ghost flex-1" href="/patient-booking.html">حجز موعد آخر</a></div>`;
  confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const renderOptions = async () => {
  const options = await publicBookingService.options();
  doctorField.innerHTML = `<option value="">اختاري الطبيب</option>${(options.doctors || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}${doctor.Specialty ? ` · ${escapeHtml(doctor.Specialty)}` : ''}</option>`).join('')}`;
  serviceField.innerHTML = `<option value="">اختاري الخدمة</option>${(options.services || []).map((service) => `<option value="${service.Id}">${escapeHtml(service.Name)} · ${service.BaseDurationMinutes} دقيقة</option>`).join('')}`;
};

const updateSlots = async () => {
  const doctorId = doctorField.value;
  const serviceId = serviceField.value;
  const date = dateField.value;
  slotField.value = '';
  priceBox.innerHTML = '';
  if (!doctorId || !serviceId || !date) {
    slotsBox.innerHTML = '<div class="col-span-full rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">اختاري الطبيب والخدمة والتاريخ.</div>';
    return;
  }
  slotsBox.innerHTML = '<div class="col-span-full p-5 text-center text-sm text-slate-500">جاري تحميل المواعيد المتاحة…</div>';
  try {
    const response = await publicBookingService.slots({ doctorId, serviceId, date });
    if (response.service) priceBox.innerHTML = `<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">سعر الخدمة: <strong class="text-slate-900">${formatMoney(response.service.Price)}</strong></div>`;
    const slots = makeSlots(response.schedules?.[0], response.booked || [], Number(response.service?.BaseDurationMinutes || 15), date, response.pauses || [], response.exceptions || []).filter((slot) => slot.getTime() > Date.now());
    slotsBox.innerHTML = slots.length ? slots.map((slot) => `<button type="button" class="btn btn-secondary" data-slot="${slot.toISOString()}">${escapeHtml(formatSlot(slot))}</button>`).join('') : '<div class="col-span-full rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">لا توجد مواعيد متاحة في هذا اليوم. اختاري تاريخًا آخر.</div>';
    slotsBox.querySelectorAll('[data-slot]').forEach((button) => button.addEventListener('click', () => {
      slotsBox.querySelectorAll('[data-slot]').forEach((item) => item.classList.remove('!bg-blue-600', '!text-white'));
      button.classList.add('!bg-blue-600', '!text-white');
      slotField.value = button.dataset.slot;
    }));
  } catch (error) {
    slotsBox.innerHTML = `<div class="col-span-full p-5 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`;
  }
};

dateField.value = localDateKey();
dateField.min = dateField.value;
renderOptions().catch((error) => showStatus(error.message || 'تعذر تحميل المواعيد المتاحة.'));
doctorField.addEventListener('change', updateSlots);
serviceField.addEventListener('change', updateSlots);
dateField.addEventListener('change', updateSlots);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!slotField.value) { showStatus('اختاري موعدًا متاحًا قبل تأكيد الحجز.'); return; }
  const button = document.querySelector('#submit-booking');
  const data = Object.fromEntries(new FormData(form).entries());
  data.doctorId = Number(data.doctorId);
  data.serviceId = Number(data.serviceId);
  data.consent = form.elements.consent.checked;
  delete data.date;
  loadingButton(button, true);
  statusBox.classList.add('hidden');
  try {
    const booking = await publicBookingService.create(data);
    renderConfirmation(booking);
  } catch (error) {
    if (['OVERLAPPING_BOOKING', 'DOUBLE_BOOKING', 'DOCTOR_PAUSED', 'SCHEDULE_UNAVAILABLE'].includes(error.code)) await updateSlots();
    showStatus(error.message || 'تعذر تأكيد الحجز. اختاري موعدًا آخر وحاولي مرة أخرى.');
  } finally { loadingButton(button, false); }
});
