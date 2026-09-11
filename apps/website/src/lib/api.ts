const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Flag stored (per-tab, sessionStorage) when the website auto-signs the user
 * out because their session/token expired or became invalid. Consumed exactly
 * once on the Sign In page so a single, clear toast is shown.
 */
const SESSION_EXPIRED_NOTIFY_KEY = 'ge_session_expired_notify_v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** True if the session-expiry notification flag was set; consumes it. */
export function consumeSessionExpiredNotification(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(SESSION_EXPIRED_NOTIFY_KEY) === '1') {
      sessionStorage.removeItem(SESSION_EXPIRED_NOTIFY_KEY);
      return true;
    }
  } catch {
    // ignore storage access errors
  }
  return false;
}

/** Clear any pending session-expiry notification flag (e.g. after sign-in). */
export function clearSessionExpiredNotification(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_NOTIFY_KEY);
  } catch {
    // ignore storage access errors
  }
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

function clearAuthAndRedirect(notifySessionExpired = false) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (window.location.pathname === '/login') {
    // Already on the Sign In page - just make sure no stale toast flag lingers.
    clearSessionExpiredNotification();
    return;
  }
  // Only flag the notification for genuine session-expiry sign-outs (an expired
  // token was being used), never for login/register 401s. It is consumed once on
  // the Sign In page so duplicate toasts are avoided across parallel requests.
  if (notifySessionExpired) {
    try {
      sessionStorage.setItem(SESSION_EXPIRED_NOTIFY_KEY, '1');
    } catch {
      // ignore storage access errors
    }
  }
  window.location.href = '/login';
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
    clearAuthAndRedirect(token != null);
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

export async function uploadFile<T = any>(
  path: string,
  file: File,
  fieldName = 'file',
  method: 'POST' | 'PUT' = 'POST',
): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append(fieldName, file);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = typeof body?.message === 'string' ? body.message : `Upload failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  const json = await res.json();
  return (json && json.success === true ? json.data : json) as T;
}
