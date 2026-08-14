const routes = [
  { match: /^\/patient-portal\/?$/, load: () => import('../pages/patient-portal.js') },
  { match: /^\/dashboard\/?$/, load: () => import('../pages/dashboard.js') },
  { match: /^\/patients\/?$/, load: () => import('../pages/patients.js') },
  { match: /^\/patients\/new\/?$/, load: () => import('../pages/patient-form.js') },
  { match: /^\/assignments\/?$/, load: () => import('../pages/assignments.js') },
  { match: /^\/patients\/(\d+)\/?$/, load: () => import('../pages/patient-profile.js') },
  { match: /^\/appointments\/?$/, load: () => import('../pages/appointments.js') },
  { match: /^\/appointments\/new\/?$/, load: () => import('../pages/appointment-form.js') },
  { match: /^\/queue\/?$/, load: () => import('../pages/queue.js') },
  { match: /^\/doctors\/?$/, load: () => import('../pages/doctors.js') },
  { match: /^\/schedules\/?$/, load: () => import('../pages/schedules.js') },
  { match: /^\/services\/?$/, load: () => import('../pages/services.js') },
  { match: /^\/pricing\/?$/, load: () => import('../pages/pricing.js') },
  { match: /^\/visits\/?$/, load: () => import('../pages/visits.js') },
  { match: /^\/cases\/?$/, load: () => import('../pages/cases.js') },
  { match: /^\/pregnancy\/?$/, load: () => import('../pages/pregnancy.js') },
  { match: /^\/medications\/?$/, load: () => import('../pages/medications.js') },
  { match: /^\/allergies\/?$/, load: () => import('../pages/allergies.js') },
  { match: /^\/labs\/?$/, load: () => import('../pages/labs.js') },
  { match: /^\/ultrasound\/?$/, load: () => import('../pages/ultrasound.js') },
  { match: /^\/documents\/?$/, load: () => import('../pages/documents.js') },
  { match: /^\/progress\/?$/, load: () => import('../pages/progress.js') },
  { match: /^\/history\/?$/, load: () => import('../pages/history.js') },
  { match: /^\/reports\/?$/, load: () => import('../pages/reports.js') },
  { match: /^\/notifications\/?$/, load: () => import('../pages/notifications.js') },
  { match: /^\/users\/?$/, load: () => import('../pages/users.js') },
  { match: /^\/settings\/?$/, load: () => import('../pages/settings.js') }
];

const pathnameOf = (path) => String(path || '').split('?')[0];

export const normalizePath = (path) => {
  const rawPath = pathnameOf(path).replace(/\/+$/, '') || '/dashboard';
  const pathname = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const query = String(path || '').includes('?') ? `?${String(path).split('?').slice(1).join('?')}` : '';
  return `${pathname}${query}`;
};

export const createRouter = ({ outlet, onRoute }) => {
  let current = null;
  const resolve = (path) => routes.find((route) => route.match.test(pathnameOf(path)));
  const render = async (path = normalizePath(`${window.location.pathname}${window.location.search}`)) => {
    const normalized = normalizePath(path);
    const routePath = pathnameOf(normalized);
    const found = resolve(routePath) || routes[0];
    const match = found.match.exec(routePath);
    if (!resolve(normalized)) window.history.replaceState({}, '', '/dashboard');
    outlet.innerHTML = '<div class="py-16">' + '<div class="skeleton h-8 w-1/3 mb-6"></div><div class="skeleton h-4 w-2/3"></div>' + '</div>';
    try {
      const module = await found.load();
      current = { path: normalized, module };
      await module.render(outlet, { params: match?.slice(1) || [], path: normalized });
      if (module.mount) await module.mount(outlet, { params: match?.slice(1) || [], path: normalized });
      outlet.focus({ preventScroll: true });
      onRoute?.(normalized);
    } catch (error) {
      outlet.innerHTML = `<div class="card p-8 text-center"><h2 class="text-lg font-bold text-slate-900">تعذر تحميل الشاشة</h2><p class="text-sm text-slate-500 mt-2">${error.message || 'حدث خطأ غير متوقع.'}</p></div>`;
      console.error(error);
    }
  };
  const navigate = (path) => {
    const normalized = normalizePath(path);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== normalized) window.history.pushState({}, '', normalized);
    return render(normalized);
  };
  window.addEventListener('popstate', () => render());
  return { render, navigate, current: () => current };
};
