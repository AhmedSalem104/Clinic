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
const inFlightGets = new Map();
const DEFAULT_TIMEOUT_MS = 15000;

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

const isFormData = (body) => typeof FormData !== 'undefined' && body instanceof FormData;

const performRequest = async (path, options = {}) => {
  const {
    method = 'GET',
    body,
    signal,
    requestKey,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cacheMode = 'no-store'
  } = options;

  if (requestKey && controllers.has(requestKey)) controllers.get(requestKey).abort();
  const controller = new AbortController();
  if (requestKey) controllers.set(requestKey, controller);

  let timedOut = false;
  let timeoutId;
  const forwardAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  const requestHeaders = { Accept: 'application/json', ...headers };
  const formData = isFormData(body);
  if (body !== undefined && body !== null && !formData) requestHeaders['Content-Type'] = 'application/json';

  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      cache: cacheMode,
      headers: requestHeaders,
      body: body === undefined || body === null ? undefined : formData ? body : JSON.stringify(body),
      signal: controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    const rawPayload = await response.text();
    let payload = rawPayload;
    if (rawPayload && contentType.includes('application/json')) {
      try { payload = JSON.parse(rawPayload); } catch (_) { payload = rawPayload; }
    }
    if (!response.ok || (payload && payload.success === false)) {
      const error = payload?.error || {};
      const code = error.code || (response.status === 409 && isBookingPath(path) ? 'DOUBLE_BOOKING' : undefined);
      const message = normalizeRequestError({
        path,
        status: response.status,
        code,
        message: error.message || (typeof payload === 'string' ? payload : payload?.message || '')
      });
      throw new ApiError(message, response.status, code, error.details);
    }
    return payload?.meta ? payload : (payload?.data ?? payload);
  } catch (error) {
    if (timedOut) throw new ApiError('استغرق تحميل البيانات وقتًا أطول من المتوقع. تحققي من الاتصال وحاولي مرة أخرى.', 408, 'REQUEST_TIMEOUT');
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', forwardAbort);
    if (requestKey && controllers.get(requestKey)?.signal === controller.signal) controllers.delete(requestKey);
  }
};

const request = (path, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase();
  const canDeduplicate = method === 'GET' && options.dedupe !== false && !options.signal && !options.requestKey;
  if (!canDeduplicate) return performRequest(path, { ...options, method });

  const key = options.dedupeKey || path;
  const existing = inFlightGets.get(key);
  if (existing) return existing;
  const promise = performRequest(path, { ...options, method }).finally(() => {
    if (inFlightGets.get(key) === promise) inFlightGets.delete(key);
  });
  inFlightGets.set(key, promise);
  return promise;
};

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload: (path, formData, options) => request(path, { ...options, method: 'POST', body: formData })
};
