import { escapeHtml } from './ui.js';

const BOOKING_MESSAGES = Object.freeze({
  OVERLAPPING_BOOKING: {
    icon: 'warning',
    title: 'الموعد لم يعد متاحًا',
    message: 'تم حجز هذا الوقت قبل تأكيد الحجز.',
    action: 'اختاري موعدًا آخر من الأوقات المتاحة؛ تم تحديث القائمة تلقائيًا.'
  },
  DOUBLE_BOOKING: {
    icon: 'warning',
    title: 'الموعد محجوز بالفعل',
    message: 'يوجد حجز مؤكد في هذا الوقت مع الطبيب المختار.',
    action: 'اختاري وقتًا آخر من القائمة المتاحة.'
  },
  SERVICE_NOT_AVAILABLE: {
    icon: 'info',
    title: 'الخدمة غير متاحة مع هذا الطبيب',
    message: 'الخدمة المختارة غير مرتبطة بالطبيب الحالي.',
    action: 'اختاري خدمة أخرى أو طبيبًا آخر.'
  },
  SCHEDULE_UNAVAILABLE: {
    icon: 'info',
    title: 'لا توجد مواعيد في هذا اليوم',
    message: 'لا يوجد جدول عمل مسجل للطبيب في التاريخ المختار.',
    action: 'اختاري تاريخًا آخر أو راجعي جدول الطبيب.'
  },
  DOCTOR_UNAVAILABLE: {
    icon: 'info',
    title: 'الطبيب غير متاح في هذا اليوم',
    message: 'يوجد استثناء أو إجازة تمنع الحجز في التاريخ المختار.',
    action: 'اختاري تاريخًا آخر.'
  },
  OUTSIDE_SCHEDULE: {
    icon: 'info',
    title: 'الوقت خارج جدول الطبيب',
    message: 'الوقت المختار لا يقع داخل ساعات عمل الطبيب.',
    action: 'اختاري وقتًا ظاهرًا ضمن المواعيد المتاحة.'
  },
  SCHEDULE_BREAK: {
    icon: 'info',
    title: 'الوقت يتعارض مع فترة راحة',
    message: 'الوقت المختار يتداخل مع فترة راحة الطبيب.',
    action: 'اختاري موعدًا آخر قبل أو بعد فترة الراحة.'
  },
  DOCTOR_PAUSED: {
    icon: 'info',
    title: 'الحجز متوقف مؤقتًا',
    message: 'الطبيب متوقف مؤقتًا خلال الوقت المختار.',
    action: 'اختاري موعدًا آخر؛ ستظهر المواعيد المتاحة فقط.'
  },
  BOOKING_IN_PAST: {
    icon: 'warning',
    title: 'اختاري موعدًا مستقبليًا',
    message: 'لا يمكن إنشاء حجز في وقت مضى.',
    action: 'اختاري تاريخًا ووقتًا قادمين.'
  },
  PATIENT_BOOKING_IN_PAST: {
    icon: 'warning',
    title: 'اختاري موعدًا مستقبليًا',
    message: 'لا يمكن إنشاء حجز في وقت مضى.',
    action: 'اختاري تاريخًا ووقتًا قادمين.'
  },
  DATE_IN_PAST: {
    icon: 'warning',
    title: 'التاريخ غير متاح',
    message: 'لا يمكن الحجز في تاريخ مضى.',
    action: 'اختاري اليوم أو تاريخًا لاحقًا.'
  },
  INVALID_PHONE: {
    icon: 'warning',
    title: 'رقم الهاتف غير صحيح',
    message: 'لم يتم التعرف على رقم هاتف صالح.',
    action: 'راجعي الرقم ثم حاولي مرة أخرى.'
  },
  PATIENT_ACCOUNT_UNLINKED: {
    icon: 'warning',
    title: 'الحساب غير مرتبط بملف مريضة',
    message: 'لا يمكن إتمام الحجز من هذا الحساب حاليًا.',
    action: 'استخدمي الحجز العام أو تواصلي مع الاستقبال لربط الحساب.'
  },
  APPOINTMENT_NOT_FOUND: {
    icon: 'info',
    title: 'الحجز غير موجود',
    message: 'لم يعد هذا الموعد موجودًا أو لم يعد متاحًا.',
    action: 'حدّثي الصفحة واختاري موعدًا آخر.'
  },
  APPOINTMENT_NOT_RESCHEDULABLE: {
    icon: 'info',
    title: 'لا يمكن إعادة جدولة الحجز',
    message: 'حالة هذا الموعد لا تسمح بتغيير وقته.',
    action: 'راجعي قائمة الحجوزات أو تواصلي مع المسؤول.'
  },
  VALIDATION_ERROR: {
    icon: 'warning',
    title: 'راجعي بيانات الحجز',
    message: 'هناك بيانات ناقصة أو غير صحيحة في النموذج.',
    action: 'راجعي الطبيب والخدمة والتاريخ والوقت ثم حاولي مرة أخرى.'
  },
  FORBIDDEN: {
    icon: 'warning',
    title: 'لا يمكن تنفيذ الحجز',
    message: 'الحساب الحالي لا يملك صلاحية الحجز بهذه الطريقة.',
    action: 'استخدمي المسار المخصص لحسابك أو تواصلي مع الاستقبال.'
  },
  BOOKING_CONFIRMATION_FAILED: {
    icon: 'error',
    title: 'تعذر تأكيد الحجز',
    message: 'لم يكتمل تأكيد الحجز على الخادم.',
    action: 'تحققي من قائمة مواعيدك قبل إعادة المحاولة، ثم اختاري وقتًا آخر إذا لزم.'
  },
  INTERNAL_ERROR: {
    icon: 'error',
    title: 'تعذر إتمام الحجز',
    message: 'حدثت مشكلة مؤقتة أثناء معالجة الحجز.',
    action: 'حاولي مرة أخرى بعد لحظات.'
  }
});

const hasArabic = (value) => /[\u0600-\u06FF]/.test(String(value || ''));

export const getBookingMessage = (error) => {
  const known = BOOKING_MESSAGES[error?.code];
  if (known) return { ...known, code: error.code };

  const message = hasArabic(error?.message) ? error.message : 'تعذر إتمام الحجز الآن.';
  return {
    icon: 'error',
    title: 'تعذر إتمام الحجز',
    message,
    action: 'راجعي البيانات وحاولي مرة أخرى، أو اختاري موعدًا آخر.',
    code: error?.code || 'UNKNOWN_BOOKING_ERROR'
  };
};

export const showBookingError = (error, options = {}) => {
  const info = getBookingMessage(error);
  if (!window.Swal) return info;
  window.Swal.fire({
    icon: options.icon || info.icon,
    title: options.title || info.title,
    html: `<div class="booking-error-dialog"><p>${escapeHtml(info.message)}</p><small>${escapeHtml(info.action)}</small></div>`,
    confirmButtonText: 'حسنًا',
    confirmButtonColor: '#2563eb',
    reverseButtons: true
  });
  return info;
};

export const bookingErrorText = (error) => {
  const info = getBookingMessage(error);
  return `${info.message} ${info.action}`;
};
