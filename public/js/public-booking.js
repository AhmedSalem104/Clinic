import { publicBookingService } from './services/public-booking-service.js';
import { makeSlots } from './utils/appointment-slots.mjs';
import { clockMinutes } from './utils/time.mjs';
import { escapeHtml, formatMoney, localDateKey, loadingButton } from './core/ui.js';

const form = document.querySelector('#public-booking-form');
const doctorField = form?.elements.doctorId;
const serviceField = form?.elements.serviceId;
const dateField = form?.elements.date;
const slotField = form?.elements.startAt;
const fullNameField = form?.elements.fullName;
const phoneField = form?.elements.phone;
const slotsBox = document.querySelector('#available-slots');
const slotsHelper = document.querySelector('#slots-helper');
const priceBox = document.querySelector('#price-box');
const statusBox = document.querySelector('#booking-status');
const submitButton = document.querySelector('#submit-booking');
const summaryDoctor = document.querySelector('#summary-doctor');
const summaryService = document.querySelector('#summary-service');
const summaryDate = document.querySelector('#summary-date');
const summaryTime = document.querySelector('#summary-time');
const summaryPrice = document.querySelector('#summary-price');
const progressSteps = [...document.querySelectorAll('[data-booking-step]')];
const progressLines = [...document.querySelectorAll('.booking-progress > i')];

let slotRequestId = 0;
let doctorOptionsRequestId = 0;

const formatDateTime = (value) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
const formatSlot = (value) => new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(value);
const formatBookingDate = (value) => value ? new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`)) : 'لم يتم الاختيار';
const selectedLabel = (field, fallback) => field?.selectedOptions?.[0]?.textContent?.trim() || fallback;

const showStatus = (message, kind = 'error') => {
  statusBox.textContent = message;
  statusBox.className = `booking-status ${kind === 'success' ? 'is-success' : 'is-error'}`;
  statusBox.classList.remove('hidden');
  statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const hideStatus = () => {
  statusBox.classList.add('hidden');
};

const renderSlotsEmpty = (title = 'اختاري تفاصيل الموعد', message = 'ستظهر هنا الأوقات المتاحة للحجز.') => {
  slotsBox.innerHTML = `<div class="booking-slots-empty"><span class="booking-slots-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></svg></span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(message)}</small></div>`;
};

const renderSlotsLoading = () => {
  slotsBox.innerHTML = '<div class="booking-slots-empty"><span class="booking-loading-spinner" aria-hidden="true"></span><strong>جاري البحث عن المواعيد</strong><small>لحظات ونظهر لك الأوقات المتاحة.</small></div>';
};

const updateSummary = () => {
  summaryDoctor.textContent = doctorField.value ? selectedLabel(doctorField, '—') : 'لم يتم الاختيار';
  summaryService.textContent = serviceField.value ? selectedLabel(serviceField, '—') : 'لم يتم الاختيار';
  summaryDate.textContent = dateField.value ? formatBookingDate(dateField.value) : 'لم يتم الاختيار';
  summaryTime.textContent = slotField.value ? formatSlot(new Date(slotField.value)) : 'اختاري وقتًا متاحًا';
  summaryTime.classList.toggle('summary-muted', !slotField.value);
};

const updateProgress = () => {
  const basicComplete = Boolean(fullNameField.value.trim() && phoneField.value.trim());
  const appointmentComplete = Boolean(doctorField.value && serviceField.value && dateField.value);
  const timeComplete = Boolean(slotField.value);
  const activeStep = timeComplete ? 3 : appointmentComplete ? 3 : basicComplete ? 2 : 1;
  progressSteps.forEach((step) => {
    const number = Number(step.dataset.bookingStep);
    step.classList.toggle('is-active', number === activeStep);
    step.classList.toggle('is-complete', (number === 1 && basicComplete && activeStep > 1) || (number === 2 && appointmentComplete && activeStep > 2));
  });
  progressLines.forEach((line, index) => line.classList.toggle('is-complete', index === 0 ? basicComplete : appointmentComplete));
};

const setPrice = (value) => {
  const hasPrice = value !== null && value !== undefined && value !== '';
  summaryPrice.textContent = hasPrice ? formatMoney(value) : '—';
  priceBox.innerHTML = hasPrice ? `<div class="booking-price"><span>سعر الخدمة قبل التأكيد</span><strong>${formatMoney(value)}</strong></div>` : '';
};

const renderConfirmation = (booking) => {
  const trackingUrl = booking.publicTrackingToken && booking.requiresQueue ? `/queue-tracking.html?token=${encodeURIComponent(booking.publicTrackingToken)}` : '';
  const accountUrl = `/patient-register.html?patientCode=${encodeURIComponent(booking.patientCode)}`;
  document.querySelector('#booking-shell').classList.add('hidden');
  const confirmation = document.querySelector('#booking-confirmation');
  confirmation.className = 'booking-confirmation-card';
  confirmation.innerHTML = `<div class="booking-confirmation-head"><div class="booking-confirmation-check" aria-hidden="true">✓</div><h1>تم تأكيد حجزك بنجاح</h1><p>احتفظي بهذه البيانات وأظهريها لفريق الاستقبال عند الوصول إلى العيادة.</p></div><div class="booking-confirmation-grid"><div class="booking-confirmation-item is-blue"><span>معرّف المريضة</span><strong dir="ltr">${escapeHtml(booking.patientCode)}</strong></div><div class="booking-confirmation-item is-blue"><span>رقم الحجز</span><strong dir="ltr">#${escapeHtml(booking.appointmentId)}</strong></div>${booking.queueNumber ? `<div class="booking-confirmation-item"><span>رقم الدور</span><strong>#${escapeHtml(booking.queueNumber)}</strong></div>` : ''}<div class="booking-confirmation-item"><span>السعر</span><strong>${formatMoney(booking.price)}</strong></div><div class="booking-confirmation-item is-wide"><span>تفاصيل الموعد</span><strong>${escapeHtml(booking.doctorName)} · ${escapeHtml(booking.serviceName)}</strong><span>${escapeHtml(formatDateTime(booking.startAt))}</span></div></div><div class="booking-confirmation-actions">${trackingUrl ? `<a class="booking-confirmation-primary" href="${trackingUrl}">متابعة الدور والوقت المتوقع</a>` : ''}<a class="booking-confirmation-secondary" href="${accountUrl}">إنشاء حساب لاحقًا</a><a class="booking-confirmation-ghost" href="/patient-booking.html">حجز موعد آخر</a></div>`;
  confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const renderServices = (services = []) => {
  serviceField.innerHTML = `<option value="">${services.length ? 'اختاري الخدمة' : 'لا توجد خدمات متاحة لهذا الطبيب'}</option>${services.map((service) => `<option value="${service.Id}">${escapeHtml(service.Name)} · ${service.BaseDurationMinutes} دقيقة</option>`).join('')}`;
  serviceField.disabled = !services.length;
};

const renderOptions = async () => {
  const options = await publicBookingService.options();
  doctorField.innerHTML = `<option value="">اختاري الطبيب</option>${(options.doctors || []).map((doctor) => `<option value="${doctor.Id}">${escapeHtml(doctor.FullName)}${doctor.Specialty ? ` · ${escapeHtml(doctor.Specialty)}` : ''}</option>`).join('')}`;
  doctorField.disabled = !(options.doctors || []).length;
  renderServices(options.services || []);
};

const updateSlots = async () => {
  const requestId = ++slotRequestId;
  const doctorId = doctorField.value;
  const serviceId = serviceField.value;
  const date = dateField.value;
  slotField.value = '';
  setPrice(null);
  updateSummary();
  updateProgress();
  hideStatus();
  if (!doctorId || !serviceId || !date) {
    slotsHelper.textContent = 'اختاري الطبيب والخدمة والتاريخ أولًا.';
    renderSlotsEmpty();
    return;
  }
  slotsHelper.textContent = 'نبحث عن أقرب أوقات متاحة.';
  renderSlotsLoading();
  try {
    const response = await publicBookingService.slots({ doctorId, serviceId, date });
    if (requestId !== slotRequestId) return;
    setPrice(response.service?.Price);
    const slots = makeSlots(response.schedules?.[0], response.booked || [], Number(response.service?.BaseDurationMinutes || 15), date, response.pauses || [], response.exceptions || []).filter((slot) => slot.getTime() > Date.now());
    const today = localDateKey();
    const now = new Date();
    const scheduleEnd = clockMinutes(response.schedules?.[0]?.EndTime);
    if (!slots.length && date === today && scheduleEnd > 0 && (now.getHours() * 60 + now.getMinutes()) >= scheduleEnd) {
      const nextDate = new Date(`${date}T12:00:00`);
      nextDate.setDate(nextDate.getDate() + 1);
      dateField.value = localDateKey(nextDate);
      await updateSlots();
      return;
    }
    if (!slots.length) {
      slotsHelper.textContent = 'جربي يومًا آخر أو اختاري خدمة مختلفة.';
      renderSlotsEmpty('لا توجد أوقات متاحة في هذا اليوم', 'اختاري تاريخًا آخر لنكمل الحجز.');
      updateSummary();
      return;
    }
    slotsHelper.textContent = `${slots.length} مواعيد متاحة — اختاري الوقت المناسب لك.`;
    slotsBox.innerHTML = slots.map((slot) => `<button type="button" class="booking-slot" data-slot="${slot.toISOString()}" aria-label="اختيار موعد ${escapeHtml(formatSlot(slot))}">${escapeHtml(formatSlot(slot))}</button>`).join('');
    slotsBox.querySelectorAll('[data-slot]').forEach((button) => button.addEventListener('click', () => {
      slotsBox.querySelectorAll('[data-slot]').forEach((item) => item.classList.remove('is-selected'));
      button.classList.add('is-selected');
      slotField.value = button.dataset.slot;
      updateSummary();
      updateProgress();
      hideStatus();
    }));
  } catch (error) {
    if (requestId !== slotRequestId) return;
    slotsHelper.textContent = 'تعذر تحميل المواعيد.';
    slotsBox.innerHTML = `<div class="booking-slots-empty"><strong class="text-red-600">تعذر تحميل المواعيد</strong><small>${escapeHtml(error.message || 'حاولي مرة أخرى.')}</small></div>`;
  }
};

dateField.value = localDateKey();
dateField.min = dateField.value;
updateSummary();
updateProgress();
renderOptions().catch((error) => {
  doctorField.innerHTML = '<option value="">تعذر تحميل الأطباء</option>';
  doctorField.disabled = true;
  renderServices([]);
  showStatus(error.message || 'تعذر تحميل بيانات الحجز. حاولي تحديث الصفحة.', 'error');
});

doctorField.addEventListener('change', async () => {
  serviceField.value = '';
  renderServices([]);
  updateSummary();
  updateProgress();
  if (doctorField.value) {
    const requestId = ++doctorOptionsRequestId;
    serviceField.innerHTML = '<option value="">جاري تحميل الخدمات…</option>';
    serviceField.disabled = true;
    try {
      const options = await publicBookingService.options({ doctorId: doctorField.value });
      if (requestId !== doctorOptionsRequestId) return;
      renderServices(options.services || []);
      if (!(options.services || []).length) renderSlotsEmpty('لا توجد خدمات مرتبطة بالطبيب', 'اختاري طبيبًا آخر أو تواصلي مع الاستقبال.');
    } catch (error) {
      if (requestId !== doctorOptionsRequestId) return;
      renderServices([]);
      slotsBox.innerHTML = `<div class="booking-slots-empty"><strong class="text-red-600">تعذر تحميل الخدمات</strong><small>${escapeHtml(error.message || 'حاولي مرة أخرى.')}</small></div>`;
    }
  }
  await updateSlots();
});

serviceField.addEventListener('change', updateSlots);
dateField.addEventListener('change', updateSlots);
[fullNameField, phoneField].forEach((field) => field.addEventListener('input', updateProgress));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!slotField.value) {
    showStatus('اختاري وقتًا متاحًا قبل تأكيد الحجز.');
    document.querySelector('.booking-section-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  data.doctorId = Number(data.doctorId);
  data.serviceId = Number(data.serviceId);
  data.consent = form.elements.consent.checked;
  delete data.date;
  loadingButton(submitButton, true);
  hideStatus();
  try {
    const booking = await publicBookingService.create(data);
    renderConfirmation(booking);
  } catch (error) {
    if (['OVERLAPPING_BOOKING', 'DOUBLE_BOOKING', 'DOCTOR_PAUSED', 'SCHEDULE_UNAVAILABLE'].includes(error.code)) await updateSlots();
    showStatus(error.message || 'تعذر تأكيد الحجز. اختاري موعدًا آخر وحاولي مرة أخرى.');
  } finally {
    loadingButton(submitButton, false);
  }
});
