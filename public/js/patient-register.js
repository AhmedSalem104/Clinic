const form = document.querySelector('#patient-registration-form');
const statusBox = document.querySelector('#registration-status');
const submitButton = form?.querySelector('button[type="submit"]');
const patientCode = new URLSearchParams(window.location.search).get('patientCode');
if (patientCode && form?.elements.patientCode) form.elements.patientCode.value = patientCode;

const showStatus = (message, kind = 'info') => {
  statusBox.textContent = message;
  statusBox.className = `mb-5 rounded-lg p-3 text-sm ${kind === 'success' ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-red-200 bg-red-50 text-red-800'}`;
  statusBox.classList.remove('hidden');
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
    showStatus(`تم إنشاء الحساب بنجاح. معرّف المريضة: ${payload.data.patientCode}. يمكنك تسجيل الدخول الآن.`, 'success');
    form.reset();
    setTimeout(() => { window.location.href = '/'; }, 1800);
  } catch (error) {
    showStatus(error.message || 'تعذر إنشاء الحساب.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'إنشاء الحساب';
  }
});
