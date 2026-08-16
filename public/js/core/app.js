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
  { title: 'حساب المريضة', items: [{ route:'/patient-portal', label:'مواعيدي ومتابعة الدور', icon:'calendar', roles:['patient'] }] },
  { title: 'نظرة عامة', items: [{ route:'/dashboard', label:'لوحة التحكم', icon:'grid' }] },
  { title: 'المرضى', items: [{ route:'/patients', label:'كل المرضى', icon:'users', permission:'patients:view_all' }, { route:'/patients/new', label:'إضافة مريضة', icon:'plus', permission:'patients:manage' }, { route:'/assignments', label:'التخصيصات', icon:'users', permission:'patients:manage' }] },
  { title: 'الحجوزات', items: [{ route:'/appointments', label:'التقويم والحجوزات', icon:'calendar', permission:'appointments:view_all' }, { route:'/appointments/new', label:'حجز جديد', icon:'plus', permission:'appointments:manage' }, { route:'/queue', label:'الطابور', icon:'clock', permission:'queue:manage' }] },
  { title: 'السجل الطبي', medical:true, items: [{ route:'/visits', label:'الزيارات', icon:'clipboard' }, { route:'/cases', label:'الحالات', icon:'medical' }, { route:'/pregnancy', label:'الحمل', icon:'medical' }, { route:'/history', label:'التاريخ النسائي والولادي', icon:'medical' }, { route:'/medications', label:'الأدوية', icon:'medical' }, { route:'/allergies', label:'الحساسيات', icon:'shield' }, { route:'/labs', label:'التحاليل', icon:'clipboard' }, { route:'/ultrasound', label:'السونار', icon:'medical' }, { route:'/documents', label:'المستندات', icon:'file' }, { route:'/progress', label:'التطور', icon:'report' }] },
  { title: 'إدارة العيادة', items: [{ route:'/doctors', label:'الأطباء', icon:'doctor', ownerOnly:true }, { route:'/schedules', label:'الجداول', icon:'calendar', roles:['owner','doctor'] }, { route:'/services', label:'الخدمات', icon:'tag', roles:['owner','doctor','reception'] }, { route:'/pricing', label:'الأسعار', icon:'tag', roles:['owner','doctor','reception'] }] },
  { title: 'الإدارة', items: [{ route:'/reports', label:'التقارير', icon:'report', permission:'reports:view' }, { route:'/notifications', label:'التنبيهات', icon:'bell' }, { route:'/users', label:'المستخدمون والصلاحيات', icon:'users', ownerOnly:true }, { route:'/settings', label:'الإعدادات', icon:'settings', ownerOnly:true }] }
];

const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.add('hidden'); };
const openSidebar = () => { sidebar.classList.add('open'); overlay.classList.remove('hidden'); };

const visibleItem = (user, item) => user.role === 'patient'
  ? Boolean(item.roles?.includes('patient'))
  : (!item.ownerOnly || user.role === 'owner') && (!item.roles || item.roles.includes(user.role)) && (!item.permission || can(user, item.permission) || (item.permission === 'patients:view_all' && can(user, 'patients:view_assigned')) || (item.permission === 'appointments:view_all' && can(user, 'appointments:view_assigned')));

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
  const showStaff = new URLSearchParams(window.location.search).get('staff') === '1';
  loginView.innerHTML = `<section class="gateway">
    <div class="gateway-backdrop" aria-hidden="true"></div>
    <div class="gateway-content">
      <header class="gateway-header"><a class="gateway-brand" href="/"><span class="gateway-brand-mark">+</span><span>عيادتي</span></a><span class="gateway-header-note">رعاية نسائية منظمة وواضحة</span></header>
      <div class="gateway-layout">
        <div class="gateway-copy">
          <div class="gateway-kicker">${icon('calendar')} <span>حجز المريضة يبدأ من هنا</span></div>
          <h1>احجزي موعدك<br><span>بسهولة واطمئنان.</span></h1>
          <p>اختاري الطبيب والخدمة والموعد المناسب لكِ، واحصلي على رقم الحجز والدور المتوقع بدون إنشاء حساب أو استخدام رمز تحقق.</p>
          <div class="gateway-actions">
            <a class="gateway-primary-action" href="/patient-booking.html">${icon('calendar')}<span><strong>احجزي موعدًا الآن</strong><small>بدون تسجيل دخول</small></span>${icon('arrow')}</a>
            <a class="gateway-secondary-action" href="/patient-register.html">${icon('users')}<span><strong>إنشاء حساب للمريضة</strong><small>لمتابعة المواعيد والدور لاحقًا</small></span></a>
          </div>
          <div class="gateway-steps"><div><b>01</b><span>اختاري الموعد</span></div><div><b>02</b><span>احفظي رقم الحجز</span></div><div><b>03</b><span>تابعي دورك</span></div></div>
        </div>
        <section id="staff-entry-card" class="gateway-staff-entry ${showStaff ? 'hidden' : ''}"><div class="gateway-staff-icon">${icon('users')}</div><span class="gateway-card-label">للعاملين في العيادة</span><h2>دخول الريسبشن والمالك</h2><p>إدارة الحجوزات والطابور والمرضى والصلاحيات من بوابة فريق العيادة.</p><button id="open-staff-login" class="gateway-staff-button" type="button">دخول فريق العيادة ${icon('arrow')}</button></section>
        <section id="staff-login-card" class="gateway-login-card ${showStaff ? '' : 'hidden'}"><button id="back-to-patient" class="gateway-back-link" type="button">${icon('arrow')} العودة إلى حجز المريضة</button><div class="gateway-login-heading"><span class="gateway-staff-icon">${icon('shield')}</span><div><span class="gateway-card-label">بوابة الفريق</span><h2>تسجيل دخول العيادة</h2></div></div><p class="gateway-login-help">للاستقبال والمالك والطبيب باستخدام بيانات الحساب الخاصة بالعيادة.</p><form id="login-form" class="space-y-5"><div><label class="form-label" for="login-email">البريد الإلكتروني</label><input class="input" id="login-email" name="email" type="email" autocomplete="username" placeholder="owner@clinic.local" required /></div><div><label class="form-label" for="login-password">كلمة المرور</label><input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required /></div><div id="login-error" class="alert alert-danger hidden"></div><button class="gateway-login-button" type="submit">دخول إلى النظام ${icon('arrow')}</button></form></section>
      </div>
      <footer class="gateway-footer"><span>الحجز الأول لا يحتاج تسجيل دخول.</span><span>عند الوصول، يستكمل الريسبشن بيانات الملف الطبي.</span></footer>
    </div>
  </section>`;
  loginView.classList.remove('hidden');
  appView.classList.add('hidden');

  const staffEntry = document.querySelector('#staff-entry-card');
  const staffCard = document.querySelector('#staff-login-card');
  const openStaff = () => { staffEntry.classList.add('hidden'); staffCard.classList.remove('hidden'); window.history.replaceState({}, '', '/?staff=1'); document.querySelector('#login-email')?.focus(); };
  const showPatient = () => { staffCard.classList.add('hidden'); staffEntry.classList.remove('hidden'); window.history.replaceState({}, '', '/'); };
  document.querySelector('#open-staff-login')?.addEventListener('click', openStaff);
  document.querySelector('#back-to-patient')?.addEventListener('click', showPatient);
  document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const errorBox = document.querySelector('#login-error');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true; button.innerHTML = 'جارٍ التحقق...'; errorBox.classList.add('hidden');
    try { await auth.login(form.email.value, form.password.value); await bootAuthenticated(); }
    catch (error) { errorBox.textContent = error.message || 'تعذر تسجيل الدخول.'; errorBox.classList.remove('hidden'); }
    finally { button.disabled = false; button.innerHTML = `دخول إلى النظام ${icon('arrow')}`; }
  });
  if (showStaff) document.querySelector('#login-email')?.focus();
};

let router;
const bootAuthenticated = async () => {
  const user = auth.user();
  const patientCanBook = window.location.pathname.startsWith('/appointments/new');
  if (user.role === 'patient' && !window.location.pathname.startsWith('/patient-portal') && !patientCanBook) window.history.replaceState({}, '', '/patient-portal');
  loginView.classList.add('hidden'); appView.classList.remove('hidden');
  renderSidebar(user); renderTopbar(user);
  if (user.role === 'patient') document.querySelector('[data-route="/notifications"]')?.remove();
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
