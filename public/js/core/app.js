import { auth } from './auth.js';
import { api, ApiError } from './api-service.js';
import { can, isMedicalRole } from './permissions.js';
import { createRouter } from './router.js';
import { escapeHtml, icon, initials, toast } from './ui.js';

const loginView = document.querySelector('#login-view');
const appView = document.querySelector('#app-view');
const sidebar = document.querySelector('#sidebar');
const topbar = document.querySelector('#topbar');
const outlet = document.querySelector('#page-content');
const overlay = document.querySelector('#mobile-overlay');

const navSections = [
  { title: 'نظرة عامة', items: [{ route:'/dashboard', label:'لوحة التحكم', icon:'grid' }] },
  { title: 'المرضى', items: [{ route:'/patients', label:'كل المرضى', icon:'users', permission:'patients:view_all' }, { route:'/patients/new', label:'إضافة مريضة', icon:'plus', permission:'patients:manage' }, { route:'/assignments', label:'التخصيصات', icon:'users', permission:'patients:manage' }] },
  { title: 'الحجوزات', items: [{ route:'/appointments', label:'التقويم والحجوزات', icon:'calendar', permission:'appointments:manage' }, { route:'/appointments/new', label:'حجز جديد', icon:'plus', permission:'appointments:manage' }, { route:'/queue', label:'الطابور', icon:'clock', permission:'queue:manage' }] },
  { title: 'السجل الطبي', medical:true, items: [{ route:'/visits', label:'الزيارات', icon:'medical' }, { route:'/cases', label:'الحالات', icon:'medical' }, { route:'/pregnancy', label:'الحمل', icon:'medical' }, { route:'/history', label:'التاريخ النسائي والولادي', icon:'medical' }, { route:'/medications', label:'الأدوية', icon:'medical' }, { route:'/allergies', label:'الحساسيات', icon:'shield' }, { route:'/labs', label:'التحاليل', icon:'medical' }, { route:'/ultrasound', label:'السونار', icon:'medical' }, { route:'/documents', label:'المستندات', icon:'medical' }, { route:'/progress', label:'التطور', icon:'medical' }] },
  { title: 'إدارة العيادة', items: [{ route:'/doctors', label:'الأطباء', icon:'doctor', ownerOnly:true }, { route:'/schedules', label:'الجداول', icon:'calendar', roles:['owner','doctor'] }, { route:'/services', label:'الخدمات', icon:'medical', roles:['owner','doctor','reception'] }, { route:'/pricing', label:'الأسعار', icon:'calendar', roles:['owner','doctor','reception'] }] },
  { title: 'الإدارة', items: [{ route:'/reports', label:'التقارير', icon:'medical', permission:'reports:view' }, { route:'/notifications', label:'التنبيهات', icon:'bell' }, { route:'/users', label:'المستخدمون والصلاحيات', icon:'users', ownerOnly:true }, { route:'/settings', label:'الإعدادات', icon:'shield', ownerOnly:true }] }
];

const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.add('hidden'); };
const openSidebar = () => { sidebar.classList.add('open'); overlay.classList.remove('hidden'); };

const visibleItem = (user, item) => (!item.ownerOnly || user.role === 'owner') && (!item.roles || item.roles.includes(user.role)) && (!item.permission || can(user, item.permission) || (item.permission === 'patients:view_all' && can(user, 'patients:view_assigned')));

const renderSidebar = (user, currentPath = window.location.pathname) => {
  const sections = navSections.map((section) => {
    const sectionVisible = !section.medical || isMedicalRole(user);
    if (!sectionVisible) return '';
    const items = section.items.filter((item) => visibleItem(user, item)).map((item) => `<a href="${item.route}" data-route="${item.route}" class="nav-link ${currentPath === item.route ? 'active' : ''}">${icon(item.icon)}<span>${item.label}</span></a>`).join('');
    return items ? `<div class="nav-group-title">${section.title}</div>${items}` : '';
  }).join('');
  sidebar.innerHTML = `<div class="px-5 pt-5 pb-3 flex items-center gap-3"><div class="brand-mark">+</div><div><div class="font-bold text-sm text-slate-900">عيادتي</div><div class="text-[10px] text-slate-400">Clinic Operations</div></div></div><div class="px-3 pb-5">${sections}</div><div class="mx-4 mb-5 mt-auto rounded-lg bg-blue-50 p-3 text-xs text-blue-800"><div class="font-semibold">بيانات حساسة</div><div class="mt-1 leading-5 text-blue-700">الوصول الطبي مسجل في سجل التدقيق.</div></div>`;
  sidebar.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); closeSidebar(); router.navigate(link.dataset.route); }));
};

const renderTopbar = (user) => {
  topbar.innerHTML = `<div class="flex items-center gap-3"><button id="menu-toggle" class="btn btn-ghost p-2 lg:hidden" aria-label="فتح القائمة">${icon('menu')}</button><div class="hidden md:block"><div class="text-xs text-slate-400">نظام تشغيل العيادة</div><div class="text-sm font-semibold text-slate-800">مرحبًا، ${escapeHtml(user.fullName.split(' ')[0])}</div></div></div><div class="flex items-center gap-3"><a href="/notifications" data-route="/notifications" class="btn btn-ghost p-2" aria-label="التنبيهات">${icon('bell')}</a><div class="h-8 w-px bg-slate-200"></div><div class="flex items-center gap-2"><div class="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">${escapeHtml(initials(user.fullName))}</div><div class="hidden sm:block"><div class="text-xs font-semibold text-slate-800">${escapeHtml(user.fullName)}</div><div class="text-[10px] text-slate-400">${escapeHtml({owner:'مالك العيادة',doctor:'طبيب',reception:'ريسبشن',patient:'مريضة'}[user.role] || user.role)}</div></div></div><button id="logout-button" class="btn btn-ghost text-xs">خروج</button></div>`;
  document.querySelector('#menu-toggle')?.addEventListener('click', openSidebar);
  document.querySelector('#logout-button')?.addEventListener('click', async () => { await auth.logout(); window.location.href = '/'; });
  document.querySelector('[data-route="/notifications"]')?.addEventListener('click', (event) => { event.preventDefault(); router.navigate('/notifications'); });
};

const renderLogin = () => {
  loginView.innerHTML = `<div class="login-panel"><div class="login-visual"><div class="max-w-lg"><div class="flex items-center gap-3"><div class="brand-mark">+</div><span class="text-sm font-bold text-slate-900">عيادتي</span></div><h1 class="mt-12 text-4xl font-bold leading-tight text-slate-900">تشغيل هادئ وواضح<br><span class="text-blue-600">لكل رحلة مريضة.</span></h1><p class="mt-5 max-w-md text-sm leading-7 text-slate-500">إدارة الحجوزات والطابور والسجل الطبي بصلاحيات واضحة وبيانات قابلة للمتابعة.</p><div class="mt-12 grid grid-cols-3 gap-3 text-xs text-slate-500"><div class="rounded-xl border border-blue-100 bg-white/70 p-3">طابور لحظي</div><div class="rounded-xl border border-blue-100 bg-white/70 p-3">سجل موحد</div><div class="rounded-xl border border-blue-100 bg-white/70 p-3">صلاحيات آمنة</div></div></div></div><div class="flex items-center justify-center bg-white"><div class="login-card"><div class="mb-8"><div class="text-2xl font-bold text-slate-900">تسجيل الدخول</div><p class="mt-2 text-sm text-slate-500">أدخل بيانات حساب العيادة للمتابعة.</p></div><form id="login-form" class="space-y-5"><div><label class="form-label" for="login-email">البريد الإلكتروني</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" placeholder="owner@clinic.local" required /></div><div><div class="flex items-center justify-between"><label class="form-label mb-0" for="login-password">كلمة المرور</label><span class="text-[11px] text-slate-400">جلسة آمنة</span></div><input class="input mt-2" id="login-password" name="password" type="password" autocomplete="current-password" required /></div><div id="login-error" class="alert alert-danger hidden"></div><button class="btn btn-primary w-full" type="submit">دخول إلى النظام</button></form><div class="mt-7 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">للتجربة المحلية بعد تشغيل seed: <span class="font-semibold">owner@clinic.local</span> / <span class="font-semibold">ChangeMe!123</span></div></div></div></div>`;
  loginView.classList.remove('hidden');
  appView.classList.add('hidden');
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errorBox = document.querySelector('#login-error');
    const button = form.querySelector('button');
    button.disabled = true; button.textContent = 'جارٍ التحقق...'; errorBox.classList.add('hidden');
    try { await auth.login(form.email.value, form.password.value); await bootAuthenticated(); }
    catch (error) { errorBox.textContent = error.message || 'تعذر تسجيل الدخول.'; errorBox.classList.remove('hidden'); }
    finally { button.disabled = false; button.textContent = 'دخول إلى النظام'; }
  });
};

let router;
const bootAuthenticated = async () => {
  const user = auth.user();
  loginView.classList.add('hidden'); appView.classList.remove('hidden');
  renderSidebar(user); renderTopbar(user);
  router = router || createRouter({ outlet, onRoute: (path) => { renderSidebar(user, path); } });
  await router.render();
  if (window.io && !window.clinicSocket) {
    window.clinicSocket = window.io({ withCredentials: true, transports: ['websocket', 'polling'] });
    window.clinicSocket.on('queue:updated', () => document.dispatchEvent(new CustomEvent('clinic:realtime', { detail: { type: 'queue' } })));
    window.clinicSocket.on('appointment:updated', () => document.dispatchEvent(new CustomEvent('clinic:realtime', { detail: { type: 'appointment' } })));
    window.clinicSocket.on('doctor:paused', () => document.dispatchEvent(new CustomEvent('clinic:realtime', { detail: { type: 'pause' } })));
    window.clinicSocket.on('doctor:resumed', () => document.dispatchEvent(new CustomEvent('clinic:realtime', { detail: { type: 'resume' } })));
  }
};

window.clinicApp = { api, auth, navigate: (path) => router?.navigate(path), toast };

const boot = async () => {
  const user = await auth.restore();
  if (user) await bootAuthenticated(); else renderLogin();
};

boot().catch((error) => { console.error(error); renderLogin(); });
