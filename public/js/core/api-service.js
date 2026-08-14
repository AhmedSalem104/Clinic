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
      throw new ApiError(error.message || 'تعذر تنفيذ الطلب.', response.status, error.code, error.details);
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
  upload: (path, formData, options) => request(path, { ...options, method: 'POST', body: formData })
};
