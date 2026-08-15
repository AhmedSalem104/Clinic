const token = new URLSearchParams(window.location.search).get('token');
const outlet = document.querySelector('#queue-status');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const format = (value) => value ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'سيُعاد الحساب';
const rawStatus = (value) => ({ booked: 'محجوز', confirmed: 'مؤكد', arrived: 'وصلت المريضة', waiting: 'في الانتظار', late: 'متأخرة', in_consultation: 'داخل الكشف', completed: 'اكتمل الكشف', no_show: 'لم تحضر', cancelled: 'تم الإلغاء', skipped: 'تم تجاوز الدور' }[value] || value || 'غير معروف');
const finishedStatuses = ['completed', 'no_show', 'cancelled', 'skipped'];

const displayStatus = (data) => {
  if (data.status === 'in_consultation') return { label: 'دورك الآن', kind: 'info' };
  if (data.status === 'completed') return { label: 'مكتمل', kind: 'success' };
  if (finishedStatuses.includes(data.status)) return { label: rawStatus(data.status), kind: 'neutral' };
  if (Number(data.peopleAhead) === 0) return { label: 'قريب دورك', kind: 'warning' };
  return { label: 'في الانتظار', kind: 'neutral' };
};

const renderShell = () => {
  outlet.innerHTML = `<div class="mb-6 text-center"><div id="queue-service" class="text-sm text-slate-500">جاري تحميل بيانات الدور...</div><div class="mt-3 text-7xl font-bold tracking-tight text-blue-600" aria-label="رقم الدور">#<span id="queue-number">—</span></div><div id="queue-status-badge" class="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700" aria-live="polite">جاري التحميل</div></div><div class="grid grid-cols-2 gap-3"><div class="rounded-xl bg-slate-50 p-4 text-center"><div class="text-xs text-slate-500">أمامك</div><div id="queue-ahead" class="mt-1 text-2xl font-bold" aria-live="polite">—</div><div class="text-xs text-slate-500">مريضة</div></div><div class="rounded-xl bg-slate-50 p-4 text-center"><div class="text-xs text-slate-500">الموعد المتوقع</div><div id="queue-expected" class="mt-1 text-sm font-bold" aria-live="polite">سيُعاد الحساب</div></div></div><div id="queue-message" class="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-center text-sm text-blue-800" aria-live="polite">سيتم تحديث الحالة تلقائيًا كل عدة ثوانٍ.</div><div id="queue-updated" class="mt-3 text-center text-[11px] text-slate-400"></div>`;
};

const setBadge = (badge, state) => {
  const styles = { success: 'bg-green-50 text-green-800', warning: 'bg-amber-50 text-amber-900', info: 'bg-blue-50 text-blue-800', neutral: 'bg-slate-100 text-slate-700' };
  badge.className = `mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles[state.kind] || styles.neutral}`;
  badge.textContent = state.label;
};

const renderData = (data) => {
  const state = displayStatus(data);
  document.querySelector('#queue-service').textContent = `${data.doctorName || 'الطبيب'} · ${data.serviceName || 'الخدمة'}`;
  document.querySelector('#queue-number').textContent = data.queueNumber ?? '—';
  document.querySelector('#queue-ahead').textContent = Math.max(0, Number(data.peopleAhead || 0));
  document.querySelector('#queue-expected').textContent = data.expectedStartAt ? `${format(data.expectedStartAt)} – ${format(data.expectedEndAt)}` : 'سيُعاد الحساب';
  setBadge(document.querySelector('#queue-status-badge'), state);
  const message = document.querySelector('#queue-message');
  message.textContent = finishedStatuses.includes(data.status) ? 'لا توجد متابعة نشطة لهذا الدور.' : state.label === 'دورك الآن' ? 'من فضلك توجهي إلى منطقة الكشف الآن.' : `الحالة الحالية: ${state.label}. سيتم تحديث البيانات تلقائيًا.`;
  message.className = `mt-5 rounded-xl border p-3 text-center text-sm ${state.kind === 'success' ? 'border-green-200 bg-green-50 text-green-800' : state.kind === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : state.kind === 'info' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-blue-100 bg-blue-50 text-blue-800'}`;
  document.querySelector('#queue-updated').textContent = `آخر تحديث: ${new Intl.DateTimeFormat('ar-EG', { timeStyle: 'medium' }).format(new Date())}`;
};

const showError = (message) => {
  const status = document.querySelector('#queue-status-badge');
  status.textContent = 'تعذر تحديث الاتصال';
  status.className = 'mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-800';
  document.querySelector('#queue-message').textContent = `${message} ستتم إعادة المحاولة تلقائيًا.`;
};

if (!token) {
  outlet.innerHTML = '<div class="text-center text-sm text-red-600">رابط متابعة الدور غير صالح.</div>';
} else {
  renderShell();
  let activeRequest;
  const load = async () => {
    if (activeRequest) activeRequest.abort();
    activeRequest = new AbortController();
    try {
      const response = await fetch(`/api/public/queue/${encodeURIComponent(token)}?t=${Date.now()}`, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }, cache: 'no-store', signal: activeRequest.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'تعذر تحميل حالة الدور.');
      renderData(payload.data);
    } catch (error) {
      if (error.name !== 'AbortError') showError(error.message);
    }
  };
  load();
  const refresh = () => { if (!document.hidden) load(); };
  const timer = window.setInterval(refresh, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  window.addEventListener('beforeunload', () => window.clearInterval(timer));
  if (window.io) {
    const socket = window.io({ transports: ['websocket', 'polling'], reconnectionAttempts: 1, timeout: 3000 });
    socket.on('queue:recalculated', load);
    socket.on('queue:updated', load);
    socket.on('connect_error', () => socket.disconnect());
  }
}
