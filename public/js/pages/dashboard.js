import { api } from '../core/api-service.js';
import { auth } from '../core/auth.js';
import { escapeHtml, formatDateTime, statusBadge, icon, skeleton, emptyState, localDateKey } from '../core/ui.js';

const roleText = {
  owner: { title: 'لوحة تشغيل العيادة', description: 'كل ما يحتاجه فريق العيادة اليوم في مكان واحد.' },
  reception: { title: 'مساحة عمل الريسبشن', description: 'ابدئي بالبحث أو الحجز أو تحديث الطابور من أقصر مسار.' },
  doctor: { title: 'مساحتي الطبية اليوم', description: 'ابدأ بالمريضة التالية، ثم افتح الزيارة من نفس المكان.' }
};

const metricColors = {
  blue: ['#2563eb', '#eff6ff'],
  green: ['#16a34a', '#f0fdf4'],
  amber: ['#d97706', '#fffbeb'],
  cyan: ['#0284c7', '#ecfeff'],
  red: ['#dc2626', '#fef2f2']
};

const metricCard = ([label, value, metricIcon, color]) => {
  const [foreground, background] = metricColors[color] || metricColors.blue;
  return `<div class="card metric-card"><div class="flex items-center justify-between"><div class="metric-label">${label}</div><div class="metric-icon" style="color:${foreground};background:${background}">${icon(metricIcon)}</div></div><div class="metric-value">${escapeHtml(value ?? 0)}</div></div>`;
};

const action = (route, label, helper, actionIcon = 'arrow', primary = false) => `<a class="dashboard-action${primary ? ' is-primary' : ''}" href="${route}" data-route="${route}">${icon(actionIcon)}<span><strong>${label}</strong><small>${helper}</small></span></a>`;

const workbench = (role, result) => {
  const copy = roleText[role] || roleText.owner;
  if (role === 'doctor') {
    const next = result.nextQueue;
    const nextAction = next
      ? `<div class="dashboard-next"><div class="dashboard-next-copy"><span>${next.QueueStatus === 'in_consultation' ? 'الكشف الجاري الآن' : 'الخطوة التالية'}</span><strong>${escapeHtml(next.PatientName)}</strong><small>#${escapeHtml(next.QueueNumber)} · ${escapeHtml(next.ServiceName)} · ${next.QueueStatus === 'in_consultation' ? 'داخل الكشف' : 'جاهزة للبدء'}</small></div><a class="btn btn-primary" href="/visits?patientId=${next.PatientId}&start=1" data-route="/visits?patientId=${next.PatientId}&start=1">${next.QueueStatus === 'in_consultation' ? 'فتح الزيارة' : 'بدء الكشف'} ${icon('arrow')}</a></div>`
      : `<div class="dashboard-next"><div class="dashboard-next-copy"><span>الطابور الآن</span><strong>لا توجد مريضة جاهزة للكشف</strong><small>يمكنك فتح الطابور لمراجعة المواعيد القادمة.</small></div><a class="btn btn-secondary" href="/queue" data-route="/queue">فتح الطابور ${icon('arrow')}</a></div>`;
    return `<section class="dashboard-workbench"><div class="dashboard-workbench-head"><div><h2>${copy.title}</h2><p>${copy.description}</p></div><span class="badge badge-info">${icon('medical')} تركيز الطبيب</span></div>${nextAction}<div class="dashboard-action-grid">${action('/queue', 'الطابور', 'المريضة التالية وحالة كل دور', 'clock', true)}${action('/visits', 'الزيارات', 'فتح أو تسجيل زيارة طبية', 'medical')}${action('/patients', 'مرضاي', 'الوصول السريع للملفات المسندة', 'users')}${action('/reports', 'التقارير', 'ملخصات وتقارير المتابعة', 'report')}</div></section>`;
  }
  return `<section class="dashboard-workbench"><div class="dashboard-workbench-head"><div><h2>${copy.title}</h2><p>${copy.description}</p></div><span class="badge badge-info">${icon('calendar')} تشغيل سريع</span></div><div class="dashboard-action-grid">${action('/appointments/new', 'حجز جديد', 'ابحثي عن المريضة ثم اختاري الموعد', 'plus', true)}${action('/appointments/new?source=walk_in', 'إضافة حضور', 'مريضة وصلت بدون موعد', 'users')}${action('/patients', 'بحث مريضة', 'بالاسم أو الهاتف أو المعرّف', 'search')}${action('/queue', 'الطابور', 'الوصول وتحديث الدور من شاشة واحدة', 'clock')}</div></section>`;
};

const upcomingTable = (rows) => rows?.length ? `<table class="data-table"><thead><tr><th>المريضة</th><th>الطبيب</th><th>الخدمة</th><th>الوقت</th><th>الدور</th><th>الحالة</th><th></th></tr></thead><tbody>${rows.map((row) => `<tr><td class="font-semibold text-slate-800"><a class="page-link" href="/patients/${row.PatientId}" data-route="/patients/${row.PatientId}">${escapeHtml(row.PatientName)}</a></td><td>${escapeHtml(row.DoctorName)}</td><td>${escapeHtml(row.ServiceName)}</td><td>${formatDateTime(row.StartAt)}</td><td>${row.QueueNumber ? `<span class="queue-number-pill">#${escapeHtml(row.QueueNumber)}</span>` : '—'}</td><td>${statusBadge(row.Status)}</td><td><a class="btn btn-ghost text-xs" href="/patients/${row.PatientId}" data-route="/patients/${row.PatientId}">فتح الملف ${icon('arrow')}</a></td></tr>`).join('')}</tbody></table>` : emptyState('لا توجد مواعيد قادمة اليوم.');

export async function render(outlet) {
  const user = auth.user() || { role: 'owner', fullName: '' };
  const role = user.role === 'doctor' ? 'doctor' : user.role === 'reception' ? 'reception' : 'owner';
  const copy = roleText[role];
  outlet.innerHTML = `<div class="section-heading"><div><h1>${copy.title}</h1><p>${copy.description}</p></div></div>${skeleton(4)}<div class="mt-6 card p-5">${skeleton(2)}</div>`;

  try {
    const result = await api.get(`/dashboard/today?date=${localDateKey()}`);
    const summary = result.summary || {};
    const primaryMetrics = role === 'doctor'
      ? [['في الانتظار', summary.WaitingPatients, 'clock', 'amber'], ['داخل الكشف', summary.InConsultation, 'medical', 'cyan'], ['مكتمل اليوم', summary.Completed, 'shield', 'green'], ['متوسط الانتظار', `${Math.round(Number(summary.AverageWait || 0))} د`, 'clock', 'blue']]
      : [['حجوزات اليوم', summary.TotalBookings, 'calendar', 'blue'], ['وصلن للعيادة', summary.ArrivedPatients, 'users', 'green'], ['في الانتظار', summary.WaitingPatients, 'clock', 'amber'], ['داخل الكشف', summary.InConsultation, 'medical', 'cyan']];
    const secondaryMetrics = role === 'doctor'
      ? [['إجمالي المواعيد', summary.TotalBookings], ['لم تحضر', summary.NoShow], ['التوقفات', summary.DoctorPauses]]
      : [['مكتمل اليوم', summary.Completed], ['لم تحضر', summary.NoShow], ['الأطباء الموجودون', summary.ActiveDoctors], ['متوسط الانتظار', `${Math.round(Number(summary.AverageWait || 0))} د`]];
    outlet.innerHTML = `${workbench(role, result)}<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">${primaryMetrics.map(metricCard).join('')}</div><div class="dashboard-secondary-metrics">${secondaryMetrics.map(([label, value]) => `<div class="dashboard-secondary-metric"><span>${label}</span><strong>${escapeHtml(value ?? 0)}</strong></div>`).join('')}</div><div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6"><section class="card xl:col-span-2"><div class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 class="font-semibold text-slate-900">${role === 'doctor' ? 'مواعيدي القادمة' : 'أقرب المواعيد'}</h2><p class="mt-1 text-xs text-slate-500">افتحي ملف المريضة مباشرة من الجدول عند الحاجة.</p></div><a class="page-link text-xs" href="/appointments" data-route="/appointments">عرض الكل</a></div><div class="table-wrap">${upcomingTable(result.upcoming)}</div></section><section class="card"><div class="border-b border-slate-100 px-5 py-4"><h2 class="font-semibold text-slate-900">تنبيهات التشغيل</h2><p class="mt-1 text-xs text-slate-500">نقاط تحتاج متابعة اليوم.</p></div><div class="space-y-3 p-5"><div class="alert alert-warning"><span>◐</span><div><strong>التوقفات اليوم</strong><div class="mt-1">${Number(summary.DoctorPauses || 0)} توقف مسجل</div></div></div><div class="rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">الوقت المتوقع للطابور يُحدّث تلقائيًا بعد كل تغيير، ويُعرض كنطاق زمني للمريضة.</div></div></section></div>`;
  } catch (error) {
    outlet.innerHTML = `<div class="section-heading"><div><h1>${copy.title}</h1><p>تعذر تحميل ملخص اليوم.</p></div></div><div class="card p-8 text-center text-sm text-slate-500">تعذر الاتصال ببيانات التشغيل. ${escapeHtml(error.message || '')}</div>`;
  }
}

export function mount(outlet) {
  outlet.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    window.clinicApp.navigate(link.dataset.route);
  }));
}
