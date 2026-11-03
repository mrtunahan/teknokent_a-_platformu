/** API istemcisi: JWT'yi saklar, hataları Türkçe mesajla fırlatır. */
const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'teknomatch.token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* yok say */ }
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, path, { body, form, raw } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/api/v1${path}`, { method, headers, body: payload });
  if (raw && res.ok) return res;
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const details = data?.details?.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join(' · ');
    throw new ApiError(res.status, data?.error || `İstek başarısız (${res.status})`, details);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p, body) => request('DELETE', p, { body }),
  upload: (p, file) => {
    const form = new FormData();
    form.append('file', file);
    return request('POST', p, { form });
  },
  /** Yetkili dosya indirme (belge) — yeni sekmede açar. */
  openFile: async (p) => {
    const res = await request('GET', p, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  download: async (p, filename) => {
    const res = await request('GET', p, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};

/** /files/... gibi göreli yolları API adresine göre çözer. */
export const fileUrl = (u) => (!u ? '' : /^https?:/.test(u) ? u : `${BASE}${u}`);
