import { patientService } from '../services/patient-service.js';
import { escapeHtml, formatDate, debounce, emptyState, statusBadge, icon } from '../core/ui.js';

const renderRows = (rows) => rows.length ? `<table class="data-table"><thead><tr><th>المعرّف</th><th>الاسم</th><th>الهاتف</th><th>العمر</th><th>الطبيب الأساسي</th><th>الحالة الحالية</th><th>آخر زيارة</th><th>الحالة</th><th></th></tr></thead><tbody>${rows.map((row) => `<tr><td><a class="page-link" href="/patients/${row.Id}" data-route="/patients/${row.Id}">${escapeHtml(row.PatientCode)}</a></td><td><a class="page-link" href="/patients/${row.Id}" data-route="/patients/${row.Id}">${escapeHtml(row.FullName)}</a></td><td dir="ltr" class="text-right">${escapeHtml(row.Phone)}</td><td>${row.DateOfBirth ? `${Math.floor((Date.now()-new Date(row.DateOfBirth).getTime())/31557600000)} سنة` : '—'}</td><td>${escapeHtml(row.AssignedDoctor || 'غير مسندة')}</td><td>${escapeHtml(row.CurrentCase || '—')}</td><td>${formatDate(row.LastVisit)}</td><td>${row.HighRiskFlag ? '<span class="badge badge-danger">! متابعة خاصة</span>' : statusBadge(row.Status)}</td><td><a class="btn btn-ghost text-xs" href="/patients/${row.Id}" data-route="/patients/${row.Id}">فتح الملف ${icon('arrow')}</a></td></tr>`).join('')}</tbody></table>` : emptyState('لا توجد مريضات مطابقة.', '<a class="btn btn-primary" href="/patients/new" data-route="/patients/new">إضافة أول مريضة</a>');

export async function render(outlet) {
  const searchParams = new URLSearchParams(window.location.search);
  const search = searchParams.get('search') || '';
  outlet.innerHTML = `<div class="section-heading"><div><h1>كل المرضى</h1><p>بحث سريع من الخادم بالاسم أو الهاتف أو Patient ID.</p></div><a class="btn btn-primary" href="/patients/new" data-route="/patients/new">${icon('plus')} إضافة مريضة</a></div><section class="card"><div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div class="relative min-w-[260px] flex-1"><span class="pointer-events-none absolute right-3 top-3 text-slate-400">${icon('search')}</span><input id="patient-search" class="input pr-10" value="${escapeHtml(search)}" placeholder="ابحث بالاسم، الهاتف أو Patient ID" aria-label="بحث المرضى" /></div><select id="patient-page-size" class="select w-auto"><option value="25">25 صف</option><option value="50">50 صف</option><option value="100">100 صف</option></select></div><div id="patients-table" class="table-wrap p-1"><div class="p-8">${emptyState('جارٍ تحميل المرضى...')}</div></div><div id="patients-pagination" class="flex items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500"></div></section>`;
  const load = async (page = 1) => {
    const table = document.querySelector('#patients-table'); table.innerHTML = '<div class="p-8"><div class="skeleton h-5 w-full mb-4"></div><div class="skeleton h-5 w-full mb-4"></div><div class="skeleton h-5 w-3/4"></div></div>';
    try {
      const result = await patientService.list({ search: document.querySelector('#patient-search')?.value || '', page, pageSize: document.querySelector('#patient-page-size')?.value || 25 });
      table.innerHTML = renderRows(result.data || []);
      const meta = result.meta || {};
      document.querySelector('#patients-pagination').innerHTML = `<span>عرض ${(result.data||[]).length} من ${meta.total || 0}</span><div class="flex gap-2"><button class="btn btn-secondary text-xs" data-page="${Math.max(1,(meta.page||1)-1)}" ${meta.page<=1?'disabled':''}>السابق</button><span class="self-center">صفحة ${meta.page||1} من ${meta.totalPages||1}</span><button class="btn btn-secondary text-xs" data-page="${Math.min(meta.totalPages||1,(meta.page||1)+1)}" ${meta.page>=meta.totalPages?'disabled':''}>التالي</button></div>`;
      document.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.clinicApp.navigate(link.dataset.route); }));
      document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => load(Number(button.dataset.page))));
    } catch (error) { table.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };
  await load(1);
  const searchInput = document.querySelector('#patient-search'); searchInput.addEventListener('input', debounce(() => { const value=searchInput.value.trim(); const url=value?`/patients?search=${encodeURIComponent(value)}`:'/patients'; window.history.replaceState({},'',url); load(1); }, 350));
  document.querySelector('#patient-page-size').addEventListener('change', () => load(1));
}
