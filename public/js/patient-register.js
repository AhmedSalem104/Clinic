import { escapeHtml } from './core/ui.js';

const form = document.querySelector('#patient-registration-form');
const statusBox = document.querySelector('#registration-status');
const submitButton = form?.querySelector('button[type="submit"]');
const contextBox = document.querySelector('#registration-context');
const successBox = document.querySelector('#registration-success');
const successMessage = document.querySelector('#registration-success-message');
const successActions = document.querySelector('#registration-success-actions');
const backLink = document.querySelector('#registration-back-link');
const params = new URLSearchParams(window.location.search);
const patientCode = params.get('patientCode')?.trim() || '';
const fromBooking = params.get('from') === 'booking' || Boolean(patientCode);
const requestedReturnTo = params.get('returnTo') || '/patient-booking.html';
const returnTo = requestedReturnTo.startsWith('/') && !requestedReturnTo.startsWith('//') ? requestedReturnTo : '/patient-booking.html';

if (patientCode && form?.elements.patientCode) {
  form.elements.patientCode.value = patientCode;
  form.elements.patientCode.readOnly = true;
  form.elements.patientCode.classList.add('bg-slate-100');
}

if (fromBooking && contextBox) {
  contextBox.innerHTML = `<div class="flex items-start gap-3"><span class="registration-success-mark !h-8 !w-8 !rounded-lg bg-blue-600">✓</span><div><strong class="block">ربط الحساب بالحجز السابق</strong><p class="mt-1 text-xs leading-6 text-blue-800">تم تجهيز معرّف المريضة من تأكيد الحجز. استخدمي نفس رقم الهاتف الذي أدخلته عند الحجز ليتم ربط الحساب بالملف الصحيح.</p><span class="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-bold text-blue-700" dir="ltr">${escapeHtml(patientCode || 'سيُبحث بالهاتف')}</span></div></div>`;
  contextBox.classList.remove('hidden');
}

if (backLink && fromBooking) backLink.href = returnTo;

const showStatus = (message, kind = 'info') => {
  statusBox.textContent = message;
  statusBox.className = `mb-5 rounded-lg border p-3 text-sm ${kind === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`;
  statusBox.classList.remove('hidden');
};

const renderSuccess = (data) => {
  const linked = Boolean(data?.linkedExistingPatient);
  form?.classList.add('hidden');
  contextBox?.classList.add('hidden');
  statusBox?.classList.add('hidden');
  successBox?.classList.remove('hidden');
  if (successMessage) successMessage.textContent = linked
    ? `تم ربط الحساب بالحجز والملف الموجود. معرّف المريضة: ${data.patientCode}. يمكنك الآن الدخول لمتابعة مواعيدك ودورك.`
    : `معرّف المريضة الخاص بك هو ${data.patientCode}. يمكنك الآن الدخول أو العودة إلى الحجز لإنشاء موعد جديد.`;
  if (successActions) {
    successActions.innerHTML = `<a href="/?patient=1">تسجيل الدخول ومتابعة مواعيدي</a><a href="${escapeHtml(returnTo)}">العودة إلى شاشة الحجز</a>`;
  }
  successBox?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.consent = form.elements.consent.checked;
  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ إنشاء الحساب...';
  statusBox.classList.add('hidden');
  try {
    const response = await fetch('/api/patient-portal/register', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const payload = await response.json();
    if (!response.ok || payload.success === false) throw new Error(payload.error?.message || 'تعذر إنشاء الحساب.');
    renderSuccess(payload.data);
  } catch (error) {
    showStatus(error.message || 'تعذر إنشاء الحساب.');
  } finally {
    if (!successBox || successBox.classList.contains('hidden')) {
      submitButton.disabled = false;
      submitButton.textContent = 'إنشاء الحساب';
    }
  }
});
