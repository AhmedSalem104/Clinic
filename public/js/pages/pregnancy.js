import { medicalService } from '../services/medical-service.js';
import { renderMedicalPage, input, formatDate, statusBadge, escapeHtml, emptyState } from './medical-common.js';
import { localDateKey } from '../core/ui.js';

const toNullableNumber = (value) => value === '' || value == null ? null : Number(value);
const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};

export async function render(outlet) {
  return renderMedicalPage(outlet, {
    title: 'Pregnancy records',
    description: 'Each pregnancy is kept as a separate case with LMP, EDD, obstetric history and outcome.',
    formTitle: 'Add pregnancy',
    load: (id) => medicalService.pregnancies(id),
    form: () => [
      input('LMP', 'lmp', 'date'),
      input('EDD', 'edd', 'date'),
      input('EDD method', 'eddMethod', 'select', { options: [['', 'Not specified'], ['lmp', 'LMP calculation'], ['early_ultrasound', 'Early ultrasound'], ['other_clinician_assessment', 'Clinician assessment']] }),
      input('Pregnancy number', 'pregnancyNumber', 'number', { min: 1, max: 30 }),
      input('Gravida', 'gravida', 'number', { min: 0, max: 30 }),
      input('Para', 'para', 'number', { min: 0, max: 30 }),
      input('Abortions / miscarriages', 'abortions', 'number', { min: 0, max: 30 }),
      input('Living children', 'livingChildren', 'number', { min: 0, max: 30 }),
      input('Fetal count', 'fetalCount', 'number', { min: 1, max: 10 }),
      input('Risk factors — one per line', 'riskFactors', 'textarea', { span2: true, max: 1500 })
    ],
    afterForm: (wrapper) => {
      const lmp = wrapper.querySelector('[name="lmp"]');
      const edd = wrapper.querySelector('[name="edd"]');
      const method = wrapper.querySelector('[name="eddMethod"]');
      const refreshEdd = () => {
        const calculated = method.value === 'lmp' && lmp.value ? addDays(lmp.value, 280) : '';
        if (calculated) edd.value = calculated;
        edd.readOnly = method.value === 'lmp';
      };
      lmp.addEventListener('input', refreshEdd);
      method.addEventListener('change', refreshEdd);
      refreshEdd();
    },
    serialize: (data) => ({
      ...data,
      pregnancyNumber: toNullableNumber(data.pregnancyNumber),
      gravida: toNullableNumber(data.gravida),
      para: toNullableNumber(data.para),
      abortions: toNullableNumber(data.abortions),
      livingChildren: toNullableNumber(data.livingChildren),
      fetalCount: toNullableNumber(data.fetalCount),
      riskFactors: data.riskFactors ? data.riskFactors.split('\n').map((item) => item.trim()).filter(Boolean) : []
    }),
    submit: (data) => medicalService.createPregnancy(data),
    table: (rows) => rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pregnancy</th><th>LMP</th><th>EDD</th><th>EDD method</th><th>Doctor</th><th>Status</th></tr></thead><tbody>${rows.map((pregnancy) => `<tr><td>${escapeHtml(pregnancy.PregnancyNumber || '—')}</td><td>${formatDate(pregnancy.LMP)}</td><td>${formatDate(pregnancy.EDD)}</td><td>${escapeHtml(pregnancy.EDDMethod || '—')}</td><td>${escapeHtml(pregnancy.AssignedDoctor || '—')}</td><td>${statusBadge(pregnancy.Status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No pregnancy records found.')
  });
}
