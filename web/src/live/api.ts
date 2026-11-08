/** TeknoOrtak API istemcisi (/api/v1): JWT'yi saklar, hataları Türkçe mesajla fırlatır. */
const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'teknoortak.token';
/** Yeniden adlandırma öncesi anahtar: açık oturumlar düşmesin diye bir kez taşınır. */
const LEGACY_TOKEN_KEY = 'teknomatch.token';

export const tokenStore = {
  get(): string | null {
    try {
      const current = localStorage.getItem(TOKEN_KEY);
      if (current) return current;
      const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacy) {
        localStorage.setItem(TOKEN_KEY, legacy);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      }
      return legacy;
    } catch {
      return null;
    }
  },
  set(t: string | null) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      }
    } catch {
      /* gizli mod: oturum yalnızca bu sekmede kalır */
    }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: string) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

type Opts = { body?: unknown; form?: FormData; raw?: boolean };

/** Bu uç noktalarda 401 "şifre hatalı" anlamına gelir; oturumu kapatmamalı. */
const PASSWORD_CHECKS = new Set(['POST /auth/login', 'POST /auth/change-password', 'DELETE /auth/me']);

async function request<T = unknown>(method: string, path: string, { body, form, raw }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }
  if (raw && res.ok) return res as unknown as T;
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !PASSWORD_CHECKS.has(`${method} ${path}`)) onUnauthorized();
    const details = (data?.details as { path?: string; message: string }[] | undefined)
      ?.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
      .join(' · ');
    throw new ApiError(res.status, data?.error || `İstek başarısız (${res.status})`, details);
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => request<T>('GET', p),
  post: <T = any>(p: string, body?: unknown) => request<T>('POST', p, { body }),
  put: <T = any>(p: string, body?: unknown) => request<T>('PUT', p, { body }),
  patch: <T = any>(p: string, body?: unknown) => request<T>('PATCH', p, { body }),
  del: <T = any>(p: string, body?: unknown) => request<T>('DELETE', p, { body }),
  upload: <T = any>(p: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<T>('POST', p, { form });
  },
  /** Yetkili dosyayı yeni sekmede açar (belgeler). */
  async openFile(p: string) {
    const res = await request<Response>('GET', p, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  async download(p: string, filename: string) {
    const res = await request<Response>('GET', p, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

/** /files/... gibi göreli yolları API adresine göre çözer. */
export const fileUrl = (u?: string | null) => (!u ? '' : /^https?:|^data:/.test(u) ? u : `${BASE}${u}`);
