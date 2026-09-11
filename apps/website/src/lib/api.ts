const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Error carrying an optional HTTP status so the UI can react (e.g. session). */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function clearAuthAndRedirect() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : 'Network request failed');
  }

  if (res.status === 401) {
    clearAuthAndRedirect();
    throw new ApiError('Unauthorized', res.status);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = typeof body?.message === 'string' ? body.message : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  const text = await res.text();
  if (!text) return {} as T;
  const json = JSON.parse(text);
  // The API wraps every success payload in { success, data, timestamp }.
  return (json && json.success === true ? json.data : json) as T;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export async function uploadFile<T = any>(path: string, file: File): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) throw new ApiError(`Upload failed (${res.status})`, res.status);
  const json = await res.json();
  return (json && json.success === true ? json.data : json) as T;
}
