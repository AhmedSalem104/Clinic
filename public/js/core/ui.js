export const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
const pad = (value) => String(value).padStart(2, '0');
export const localDateKey = (value = new Date()) => { const date = value instanceof Date ? value : new Date(value); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
export const formatDate = (value) => value ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value)) : '—';
export const formatDateTime = (value) => value ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const formatMoney = (value) => value == null ? '—' : `${Number(value).toLocaleString('ar-EG')} ج.م`;
export const initials = (name) => String(name || 'ع').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
export const statusLabel = (status) => ({ booked: 'محجوز', confirmed: 'مؤكد', arrived: 'وصلت', waiting: 'انتظار', in_consultation: 'داخل الكشف', completed: 'مكتمل', late: 'متأخرة', no_show: 'لم تحضر', cancelled: 'ملغي', skipped: 'تم تجاوزها', active: 'نشط', inactive: 'غير نشط', paused: 'متوقف', resumed: 'مستأنف', draft: 'مسودة', closed: 'مغلق', resolved: 'تم الحل', on_hold: 'معلّق', ordered: 'مطلوب', resulted: 'ظهرت النتيجة', collected: 'تم السحب', stopped: 'متوقف', critical: 'حرج' }[status] || status || '—');
export const statusBadge = (status) => {
  const kind = ['completed', 'active', 'confirmed', 'arrived', 'resulted', 'resolved', 'resumed'].includes(status) ? 'success' : ['late', 'waiting', 'paused', 'draft', 'ordered', 'on_hold'].includes(status) ? 'warning' : ['cancelled', 'no_show', 'critical', 'inactive'].includes(status) ? 'danger' : ['in_consultation', 'collected'].includes(status) ? 'info' : 'neutral';
  return `<span class="badge badge-${kind}"><span aria-hidden="true">${kind === 'success' ? '●' : kind === 'danger' ? '!' : kind === 'warning' ? '◐' : '•'}</span>${escapeHtml(statusLabel(status))}</span>`;
};
export const icon = (name) => ({
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-8-4.5-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3c0 6.5-8 11-8 11Z"/><path d="M12 8v6M9 11h6"/></svg>',
  doctor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0 1 14 0M17 11v6M14 14h6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>'
}[name] || '');
export const skeleton = (count = 4) => `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">${Array.from({ length: count }, () => '<div class="card p-4"><div class="skeleton h-4 w-1/2 mb-4"></div><div class="skeleton h-8 w-1/3"></div></div>').join('')}</div>`;
export const emptyState = (message = 'لا توجد بيانات لعرضها.', action = '') => `<div class="empty-state"><div><div class="text-3xl mb-3">⌁</div><p class="m-0 mb-3">${escapeHtml(message)}</p>${action}</div></div>`;
export const toast = (title, iconName = 'success') => window.Swal?.fire({ toast: true, position: 'top-start', icon: iconName, title, showConfirmButton: false, timer: 2600, timerProgressBar: true });
export const confirm = async (title, text, confirmButtonText = 'تأكيد') => { const result = await window.Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText, cancelButtonText: 'إلغاء', reverseButtons: true, confirmButtonColor: '#2563eb' }); return result.isConfirmed; };
export const loadingButton = (button, loading) => { if (!button) return; button.disabled = loading; button.dataset.original = button.dataset.original || button.innerHTML; button.innerHTML = loading ? '<span class="animate-spin inline-block">◌</span> جارٍ الحفظ...' : button.dataset.original; };
export const debounce = (fn, wait = 350) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), wait); }; };
export const formValue = (form, name) => { const field=form.elements[name]; if(!field) return null; if(field.type==='checkbox') return field.checked; return field.value || null; };
