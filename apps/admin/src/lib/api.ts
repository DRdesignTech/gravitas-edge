const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

import { ApiError } from './errors';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function toApiError(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => '');
  let message = `Error ${res.status}`;
  if (text) {
    try {
      const json = JSON.parse(text);
      const raw = json?.message;
      if (Array.isArray(raw)) message = raw.join(' ');
      else if (typeof raw === 'string' && raw.trim()) message = raw.trim();
    } catch {
      // not JSON; ignore
    }
  }
  return new ApiError(message, res.status);
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const apiErr = await toApiError(res);
    // Only treat a 401 as session expiry when it came from an authenticated
    // request. A failed login (no token attached) must surface its own
    // message instead of redirecting.
    if (res.status === 401 && token) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
      throw new ApiError(apiErr.message, 401);
    }
    throw apiErr;
  }

  const text = await res.text();
  if (!text) return {} as T;
  const json = JSON.parse(text);
  return (json && json.success === true ? json.data : json) as T;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export async function uploadFile<T = any>(
  path: string,
  file: File,
  fields?: Record<string, string>,
): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  if (fields) {
    for (const [k, v] of Object.entries(fields)) formData.append(k, v);
  }
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    throw await toApiError(res);
  }
  const json = await res.json();
  return (json && json.success === true ? json.data : json) as T;
}
