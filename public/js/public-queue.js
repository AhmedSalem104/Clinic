const token = new URLSearchParams(window.location.search).get('token');
const outlet = document.querySelector('#queue-status');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const format = (value) => value ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'سيُعاد الحساب';
const status = (value) => ({ booked: 'تم الحجز', confirmed: 'تم التأكيد', arrived: 'وصلت المريضة', waiting: 'في الانتظار', late: 'متأخرة', in_consultation: 'داخل الكشف', completed: 'اكتمل الكشف', no_show: 'لم تحضر', cancelled: 'تم الإلغاء', skipped: 'تم التجاوز' }[value] || value || 'غير معروف');

const render = (data) => {
  const finished = ['completed', 'no_show', 'cancelled', 'skipped'].includes(data.status);
  outlet.innerHTML = `<div class="mb-6 text-center"><div class="text-sm text-slate-500">${escapeHtml(data.doctorName || 'الطبيب')} · ${escapeHtml(data.serviceName || 'الخدمة')}</div><div class="mt-3 text-7xl font-bold tracking-tight text-blue-600">#${escapeHtml(data.queueNumber)}</div><div class="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">${escapeHtml(status(data.status))}</div></div><div class="grid grid-cols-2 gap-3"><div class="rounded-xl bg-slate-50 p-4 text-center"><div class="text-xs text-slate-500">أمامك</div><div class="mt-1 text-2xl font-bold">${escapeHtml(data.peopleAhead)}</div><div class="text-xs text-slate-500">مريضة</div></div><div class="rounded-xl bg-slate-50 p-4 text-center"><div class="text-xs text-slate-500">الموعد المتوقع</div><div class="mt-1 text-sm font-bold">${data.expectedStartAt ? `${escapeHtml(format(data.expectedStartAt))} – ${escapeHtml(format(data.expectedEndAt))}` : 'سيُعاد الحساب'}</div></div></div>${finished ? '<div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-600">لا توجد متابعة نشطة لهذا الدور.</div>' : '<div class="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-center text-sm text-blue-800">سيتم تحديث هذه الصفحة عند تغير ترتيب الدور.</div>'}`;
};

const load = async () => {
  if (!token) { outlet.innerHTML = '<div class="text-center text-sm text-red-600">رابط متابعة الدور غير صالح.</div>'; return; }
  try { const response = await fetch(`/api/public/queue/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || 'تعذر تحميل الدور.'); render(payload.data); } catch (error) { outlet.innerHTML = `<div class="text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
};

load();
setInterval(load, 30000);
if (window.io) { const socket = window.io({ transports: ['websocket', 'polling'] }); socket.on('queue:recalculated', load); socket.on('queue:updated', load); }
