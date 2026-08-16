import { patientService } from '../services/patient-service.js';
import { escapeHtml, formatDate, formatDateTime, statusBadge, emptyState, icon, loadingButton, toast, debounce } from '../core/ui.js';

const input = (label, name, type = 'text', options = {}) => {
  const wrapper = options.span2 ? 'span-2' : '';
  const required = options.required ? 'required' : '';
  if (type === 'textarea') return `<div class="${wrapper}"><label class="form-label" for="medical-${name}">${label}${options.required ? ' <span class="text-red-500">*</span>' : ''}</label><textarea class="textarea" id="medical-${name}" name="${name}" maxlength="${options.max || 2000}" ${required} placeholder="${options.placeholder || ''}"></textarea></div>`;
  if (type === 'select') return `<div class="${wrapper}"><label class="form-label" for="medical-${name}">${label}${options.required ? ' <span class="text-red-500">*</span>' : ''}</label><select class="select" id="medical-${name}" name="${name}" ${required}>${(options.options || []).map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></div>`;
  return `<div class="${wrapper}"><label class="form-label" for="medical-${name}">${label}${options.required ? ' <span class="text-red-500">*</span>' : ''}</label><input class="input" id="medical-${name}" name="${name}" type="${type}" ${options.step ? `step="${options.step}"` : ''} ${options.min != null ? `min="${options.min}"` : ''} ${options.max != null ? `max="${options.max}"` : ''} ${type === 'file' ? 'accept="application/pdf,image/jpeg,image/png,image/webp"' : ''} ${options.readOnly ? 'readonly' : ''} ${required} /></div>`;
};

const renderPatientPicker = async (outlet, config, initialPatientId) => {
  let selected = null;
  if (initialPatientId) {
    try { selected = await patientService.get(initialPatientId); } catch (_) { /* يظل اختيار المريضة متاحًا */ }
  }

  outlet.innerHTML = `<div class="section-heading"><div><h1>${icon(config.icon || 'medical')}${config.title}</h1><p>${config.description}</p></div>${config.allowAdd !== false ? `<button id="show-medical-form" class="btn btn-primary">${icon('plus')} إضافة سجل</button>` : ''}</div><section class="card p-4"><label class="form-label">اختاري المريضة لفتح الوحدة</label><div class="relative"><input id="medical-patient-search" class="input" placeholder="الاسم أو الهاتف أو معرّف المريضة" value="${selected ? escapeHtml(selected.FullName) : ''}"><div id="medical-patient-results" class="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg"></div></div><div id="medical-selected" class="mt-3">${selected ? `<div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(selected.FullName)}</strong> · ${escapeHtml(selected.PatientCode)} · ${escapeHtml(selected.Phone)}</div>` : '<div class="text-xs text-slate-500">لم يتم اختيار مريضة.</div>'}</div></section><section id="medical-form-wrap" class="card p-5 mt-5 hidden"></section><section id="medical-list-wrap" class="card mt-5"></section>`;

  const results = document.querySelector('#medical-patient-results');
  const search = document.querySelector('#medical-patient-search');
  let loadSequence = 0;
  const loadData = async () => {
    const sequence = ++loadSequence;
    const list = document.querySelector('#medical-list-wrap');
    if (!selected) { list.innerHTML = emptyState('اختاري مريضة لعرض السجلات.'); return; }
    list.innerHTML = '<div class="p-8"><div class="skeleton h-5 w-full mb-4"></div><div class="skeleton h-5 w-2/3"></div></div>';
    try {
      const rows = (await config.load(selected.Id)) || [];
      if (sequence !== loadSequence) return;
      list.innerHTML = config.table(rows);
    }
    catch (error) { if (sequence !== loadSequence) return; list.innerHTML = `<div class="p-8 text-center text-sm text-red-600">${escapeHtml(error.message)}</div>`; }
  };

  search.addEventListener('input', debounce(async () => {
    const query = search.value.trim();
    if (query.length < 2) { results.innerHTML = ''; return; }
    try {
      const response = await patientService.list({ search: query, page: 1, pageSize: 8 });
      results.innerHTML = (response.data || []).map((patient) => `<button type="button" class="block w-full border-b border-slate-100 p-3 text-right text-sm hover:bg-slate-50" data-patient="${patient.Id}"><strong>${escapeHtml(patient.FullName)}</strong><span class="mx-2 text-xs text-slate-400">${escapeHtml(patient.PatientCode)} · ${escapeHtml(patient.Phone)}</span></button>`).join('') || '<div class="p-3 text-xs text-slate-500">لا توجد نتيجة.</div>';
      results.querySelectorAll('[data-patient]').forEach((button) => button.addEventListener('click', async () => {
        selected = await patientService.get(Number(button.dataset.patient));
        window.history.replaceState({}, '', `${window.location.pathname}?patientId=${selected.Id}`);
        search.value = selected.FullName;
        results.innerHTML = '';
        document.querySelector('#medical-selected').innerHTML = `<div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>${escapeHtml(selected.FullName)}</strong> · ${escapeHtml(selected.PatientCode)} · ${escapeHtml(selected.Phone)}</div>`;
        await loadData();
      }));
    } catch (error) { results.innerHTML = `<div class="p-3 text-xs text-red-600">${escapeHtml(error.message)}</div>`; }
  }, 350));

  const openMedicalForm = async () => {
    if (!selected) { window.Swal.fire({ icon: 'info', title: 'اختاري المريضة أولًا' }); return; }
    const wrapper = document.querySelector('#medical-form-wrap');
    wrapper.classList.toggle('hidden');
    if (wrapper.classList.contains('hidden')) return;
    wrapper.innerHTML = `<div class="flex items-center justify-between mb-5"><div><h2 class="font-semibold">${config.formTitle || 'إضافة سجل'}</h2><p class="mt-1 text-xs text-slate-500">تُحفظ القيم المهيكلة للتقارير، ويُستخدم النص الحر للسياق السريري فقط.</p></div><button type="button" class="btn btn-ghost" id="hide-medical-form">إغلاق</button></div><form id="medical-form" class="form-grid">${config.form(selected).join('')}<div class="span-2 mt-2 flex justify-end"><button class="btn btn-primary" type="submit">${icon('save')} حفظ السجل</button></div></form>`;
    if (config.afterForm) await config.afterForm(wrapper, selected);
    wrapper.querySelector('#hide-medical-form').addEventListener('click', () => wrapper.classList.add('hidden'));
    wrapper.querySelector('#medical-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type=submit]');
      loadingButton(button, true);
      try {
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        values.patientId = selected.Id;
        const payload = config.serialize ? config.serialize(values, selected) : values;
        if (payload instanceof FormData) payload.append('patientId', String(selected.Id));
        else payload.patientId = selected.Id;
        await config.submit(payload);
        toast('تم حفظ السجل');
        event.currentTarget.reset();
        wrapper.classList.add('hidden');
        await loadData();
      } catch (error) { window.Swal.fire({ icon: 'error', title: 'تعذر الحفظ', text: error.message }); }
      finally { loadingButton(button, false); }
    });
  };

  document.querySelector('#show-medical-form')?.addEventListener('click', openMedicalForm);

  await loadData();
  if (config.autoOpen && selected) await openMedicalForm();
};

export const renderMedicalPage = (outlet, config) => {
  const query = new URLSearchParams(window.location.search);
  return renderPatientPicker(outlet, { ...config, autoOpen: config.autoOpen ?? query.get('start') === '1' }, Number(query.get('patientId') || 0));
};
export { input, formatDate, formatDateTime, statusBadge, escapeHtml, emptyState };
