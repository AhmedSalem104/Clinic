const token = new URLSearchParams(window.location.search).get('token');
const outlet = document.querySelector('#queue-status');
const finishedStatuses = ['completed', 'no_show', 'cancelled', 'skipped'];
const activeStatuses = ['booked', 'confirmed', 'arrived', 'waiting', 'late', 'in_consultation'];

const format = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => value
  ? new Intl.DateTimeFormat('ar-EG', options).format(new Date(value))
  : 'سيُعاد الحساب';

const displayStatus = (data) => {
  if (data.status === 'in_consultation') return { label: 'دورك الآن', kind: 'info', message: 'من فضلك توجهي إلى منطقة الكشف الآن.' };
  if (data.status === 'completed') return { label: 'اكتمل الكشف', kind: 'success', message: 'اكتملت هذه الزيارة. نتمنى لكِ دوام الصحة.' };
  if (['cancelled', 'no_show', 'skipped'].includes(data.status)) {
    const labels = { cancelled: 'تم إلغاء الموعد', no_show: 'لم يتم تسجيل الحضور', skipped: 'تم تجاوز الدور' };
    return { label: labels[data.status], kind: 'neutral', message: 'لا توجد متابعة نشطة لهذا الدور.' };
  }
  if (['booked', 'confirmed'].includes(data.status)) return { label: 'بانتظار تسجيل الوصول', kind: 'neutral', message: 'تم حفظ الحجز. عند الوصول، سجلي حضورك مع الاستقبال.' };
  if (Number(data.peopleAhead) === 0) return { label: 'أنتِ التالية', kind: 'warning', message: 'اقترب دورك جدًا. يرجى البقاء بالقرب من منطقة الكشف.' };
  if (Number(data.peopleAhead) === 1) return { label: 'قريب دورك', kind: 'warning', message: 'تبقت مريضة واحدة أمامك. سنحدّث الشاشة تلقائيًا.' };
  return { label: 'في الانتظار', kind: 'neutral', message: `أمامك ${Math.max(0, Number(data.peopleAhead || 0))} مريضات. سنحدّث الشاشة تلقائيًا.` };
};

const progressFor = (data) => {
  if (data.status === 'completed') return { value: 100, label: 'اكتملت الرحلة' };
  if (finishedStatuses.includes(data.status)) return { value: 100, label: 'انتهت المتابعة' };
  if (data.status === 'in_consultation') return { value: 82, label: 'الكشف جارٍ الآن' };
  if (Number(data.peopleAhead) === 0 && activeStatuses.includes(data.status)) return { value: 68, label: 'أنتِ التالية' };
  if (Number(data.peopleAhead) === 1) return { value: 52, label: 'اقترب دورك' };
  return { value: 32, label: 'في انتظار الدور' };
};

const renderShell = () => {
  outlet.innerHTML = `
    <div class="queue-tracking-hero">
      <div class="queue-tracking-kicker"><span class="queue-kicker-dot"></span> متابعتك في العيادة</div>
      <div id="queue-service" class="queue-service-line">جاري تحميل بيانات الطبيب والخدمة…</div>
      <div class="queue-number-stage">
        <span class="queue-number-caption">رقم دورك</span>
        <div class="queue-number-value" aria-label="رقم الدور">#<strong id="queue-number">—</strong></div>
        <span id="queue-current-turn" class="queue-current-turn">الدور الجاري الآن: —</span>
      </div>
      <div id="queue-status-badge" class="queue-status-badge" aria-live="polite">جاري التحميل</div>
    </div>
    <section class="queue-progress-panel" aria-label="تقدم الدور">
      <div class="queue-progress-heading"><div><span>رحلة الانتظار</span><strong id="queue-progress-label">جاري الحساب…</strong></div><strong id="queue-progress-percent">—</strong></div>
      <div class="queue-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="queue-progress-bar"></span></div>
      <div class="queue-progress-steps"><span data-queue-step="booked"><i>✓</i><b>تم الحجز</b></span><span data-queue-step="waiting"><i>2</i><b>في الانتظار</b></span><span data-queue-step="current"><i>3</i><b>دورك الآن</b></span><span data-queue-step="completed"><i>4</i><b>اكتمل</b></span></div>
    </section>
    <div class="queue-insight-grid">
      <article class="queue-insight-card queue-ahead-card"><span class="queue-insight-icon">↓</span><div><small>أمامك الآن</small><strong id="queue-ahead" aria-live="polite">—</strong><em>مريضات</em></div></article>
      <article class="queue-insight-card"><span class="queue-insight-icon is-time">◷</span><div><small>الوقت المتوقع</small><strong id="queue-expected" class="queue-expected" aria-live="polite">سيُعاد الحساب</strong><em>نطاق تقريبي</em></div></article>
    </div>
    <div id="queue-message" class="queue-message" aria-live="polite">سيتم تحديث الحالة تلقائيًا.</div>
    <div class="queue-update-line"><span class="queue-sync-dot"></span><span id="queue-updated">بانتظار أول تحديث</span></div>`;
};

const setStatus = (data, state) => {
  const badge = document.querySelector('#queue-status-badge');
  badge.className = `queue-status-badge is-${state.kind}`;
  badge.textContent = state.label;
  document.body.dataset.queueStatus = data.status || '';
};

const setProgress = (data) => {
  const progress = progressFor(data);
  const bar = document.querySelector('#queue-progress-bar');
  const track = bar.parentElement;
  const percent = document.querySelector('#queue-progress-percent');
  const label = document.querySelector('#queue-progress-label');
  bar.style.width = `${progress.value}%`;
  percent.textContent = `${progress.value}%`;
  label.textContent = progress.label;
  track.setAttribute('aria-valuenow', String(progress.value));
  const stepStatus = data.status === 'completed' ? 'completed' : data.status === 'in_consultation' || Number(data.peopleAhead) === 0 ? 'current' : data.status === 'booked' || data.status === 'confirmed' ? 'booked' : 'waiting';
  const order = ['booked', 'waiting', 'current', 'completed'];
  const activeIndex = order.indexOf(stepStatus);
  document.querySelectorAll('[data-queue-step]').forEach((step) => {
    const index = order.indexOf(step.dataset.queueStep);
    step.classList.toggle('is-active', step.dataset.queueStep === stepStatus);
    step.classList.toggle('is-complete', index < activeIndex);
  });
};

const renderData = (data) => {
  const state = displayStatus(data);
  const progress = progressFor(data);
  const signature = [data.status, data.peopleAhead, data.queueNumber, data.expectedStartAt, data.currentQueueNumber].join('|');
  const changed = outlet.dataset.queueSignature && outlet.dataset.queueSignature !== signature;
  outlet.dataset.queueSignature = signature;
  document.querySelector('#queue-service').textContent = `${data.doctorName || 'الطبيب'} · ${data.serviceName || 'الخدمة'}`;
  document.querySelector('#queue-number').textContent = data.queueNumber ?? '—';
  document.querySelector('#queue-current-turn').textContent = data.currentQueueNumber ? `الدور الجاري الآن: #${data.currentQueueNumber}` : 'الدور الجاري الآن: سيظهر بعد تسجيل الوصول';
  document.querySelector('#queue-ahead').textContent = Math.max(0, Number(data.peopleAhead || 0));
  document.querySelector('#queue-expected').textContent = data.expectedStartAt ? `${format(data.expectedStartAt)} – ${format(data.expectedEndAt)}` : 'سيُعاد الحساب';
  document.querySelector('#queue-message').textContent = state.message;
  setStatus(data, state);
  setProgress(data);
  document.querySelector('#queue-updated').textContent = `آخر تحديث ${format(new Date(), { timeStyle: 'medium' })}`;
  if (changed) {
    outlet.classList.remove('queue-data-changed');
    void outlet.offsetWidth;
    outlet.classList.add('queue-data-changed');
  }
  if (progress.value === 100 || data.status === 'in_consultation') document.querySelector('.queue-tracking-card')?.classList.add('is-attention');
  else document.querySelector('.queue-tracking-card')?.classList.remove('is-attention');
};

const showError = (message) => {
  const status = document.querySelector('#queue-status-badge');
  if (!status) return;
  status.textContent = 'تعذر تحديث الاتصال';
  status.className = 'queue-status-badge is-error';
  const messageBox = document.querySelector('#queue-message');
  if (messageBox) messageBox.textContent = `${message} ستتم إعادة المحاولة تلقائيًا.`;
};

if (!token) {
  outlet.innerHTML = '<div class="queue-error-state"><strong>رابط متابعة الدور غير صالح</strong><span>اطلبي رابط متابعة جديدًا من رسالة الحجز أو الاستقبال.</span></div>';
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
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('beforeunload', () => window.clearInterval(timer));
  if (window.io) {
    const socket = window.io({ transports: ['websocket', 'polling'], reconnectionAttempts: 1, timeout: 3000 });
    socket.on('queue:recalculated', load);
    socket.on('queue:updated', load);
    socket.on('doctor:paused', load);
    socket.on('doctor:resumed', load);
    socket.on('connect_error', () => socket.disconnect());
  }
}
