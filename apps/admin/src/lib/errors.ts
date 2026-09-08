export type ApiErrorKind =
  | 'auth'
  | 'session'
  | 'unauthorized'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'network'
  | 'rate_limit'
  | 'server'
  | 'unknown';

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  message: string;
}

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const GENERIC = 'Something went wrong. Please try again.';
const NETWORK_HINTS = /failed to fetch|networkerror|load failed|fetch failed|econnrefused|socket/i;

function inferKind(message: string, status?: number): ApiErrorKind {
  if (status === 401) {
    // A failed login surfaces the API's message ("Invalid credentials",
    // "Account is not active"); a real 401 from an authed call is an
    // expired/invalid session.
    if (/invalid credentials|account is not active|incorrect|email or password/i.test(message)) {
      return 'auth';
    }
    return 'session';
  }
  if (status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status != null && status >= 500) return 'server';
  if (/invalid or expired|token|logged in|session .* expir/i.test(message)) return 'session';
  if (/unauthorized|forbidden|access|permission/i.test(message)) return 'unauthorized';
  if (/not found/i.test(message)) return 'not_found';
  if (/password|credentials|email .* incorrect|invalid.*password/i.test(message)) return 'auth';
  if (NETWORK_HINTS.test(message)) return 'network';
  if (/validation|must be|required|invalid/i.test(message)) return 'validation';
  if (/already|exists|conflict|in use/i.test(message)) return 'conflict';
  return 'unknown';
}

function kindMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case 'session':
      return 'Your session has expired. Please log in again.';
    case 'unauthorized':
      return "You don't have permission to do that.";
    case 'not_found':
      return "We couldn't find what you were looking for.";
    case 'validation':
      return 'Please check your details and try again.';
    case 'rate_limit':
      return "You're doing that too quickly. Please wait a moment and try again.";
    case 'network':
      return "We couldn't reach the server. Check your connection and try again.";
    case 'server':
      return "We couldn't process that right now. Please try again in a moment.";
    case 'auth':
      return 'The email or password is incorrect. Please try again.';
    case 'conflict':
      return 'That already exists or is being used. Please try something else.';
    default:
      return GENERIC;
  }
}

export function parseApiError(error: unknown, status?: number): ApiErrorInfo {
  if (!error) return { kind: 'unknown', message: GENERIC };

  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);

  const cleaned = raw
    .replace(/\s*\(\.\.\.\/.*\)$/s, '')
    .replace(/^PrismaClient\w*Error:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/\s+at\s+\S+.*$/s, '')
    .trim();

  const errStatus = error instanceof ApiError ? error.status : undefined;
  const kind = inferKind(cleaned, status ?? errStatus);

  const specificKinds: ApiErrorKind[] = ['auth', 'validation', 'conflict', 'not_found'];
  if (specificKinds.includes(kind)) {
    const short = cleaned.length > 0 && cleaned.length <= 160;
    if (short && !NETWORK_HINTS.test(cleaned)) {
      return { kind, message: cleaned };
    }
  }

  return { kind, message: kindMessage(kind) };
}

export function isSessionError(error: unknown): boolean {
  return parseApiError(error, 401).kind === 'session';
}

export function getErrorMessage(error: unknown, status?: number): string {
  return parseApiError(error, status).message;
}
