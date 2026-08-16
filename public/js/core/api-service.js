export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const controllers = new Map();

const isTechnicalErrorMessage = (value) => {
  const message = String(value || '').trim();
  return !message || /^(?:conflict|conflict\s+409|409|409\s+conflict|http\s+409|request failed)$/i.test(message);
};

const isBookingPath = (path) => /^\/(?:appointments(?:\/|$)|public\/booking(?:\/|$))/.test(String(path || ''));

const normalizeRequestError = ({ path, status, code, message }) => {
  if (!isTechnicalErrorMessage(message)) return message;
  if (status === 409 && (code === 'OVERLAPPING_BOOKING' || code === 'DOUBLE_BOOKING' || isBookingPath(path))) {
    return 'الموعد الذي اخترته لم يعد متاحًا؛ تم حجزه للتو. اختاري وقتًا آخر من المواعيد الظاهرة، وسيتم تحديث القائمة تلقائيًا.';
  }
  if (status === 409) return 'تعذر إتمام العملية لأن البيانات تغيرت أثناء الحفظ. حدّثي القائمة وحاولي مرة أخرى.';
  return message || 'تعذر تنفيذ الطلب.';
};

const request = async (path, options = {}) => {
  const { method = 'GET', body, signal, requestKey, headers = {} } = options;
  if (requestKey && controllers.has(requestKey)) controllers.get(requestKey).abort();
  const controller = new AbortController();
  if (requestKey) controllers.set(requestKey, controller);
  const requestHeaders = { Accept: 'application/json', ...headers };
  const isForm = body instanceof FormData;
  if (body !== undefined && body !== null && !isForm) requestHeaders['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: requestHeaders,
      body: body === undefined || body === null ? undefined : isForm ? body : JSON.stringify(body),
      signal: signal || controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok || (payload && payload.success === false)) {
      const error = payload?.error || {};
      const code = error.code || (response.status === 409 && isBookingPath(path) ? 'DOUBLE_BOOKING' : undefined);
      const message = normalizeRequestError({ path, status: response.status, code, message: error.message || (typeof payload === 'string' ? payload : '') });
      throw new ApiError(message, response.status, code, error.details);
    }
    return payload?.meta ? payload : (payload?.data ?? payload);
  } finally {
    if (requestKey && controllers.get(requestKey)?.signal === controller.signal) controllers.delete(requestKey);
  }
};

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload: (path, formData, options) => request(path, { ...options, method: 'POST', body: formData })
};
