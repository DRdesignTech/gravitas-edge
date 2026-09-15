/**
 * Human-friendly error handling for the Gravitas Edge Consulting apps.
 *
 * Never lets raw Prisma/DB/network/stack messages leak to the user. Maps
 * structured API errors (including the backend's stable `code` field) to
 * clear, actionable copy and falls back to a safe generic message when the
 * underlying error is unknown.
 */

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
  /** Stable backend error code (e.g. ACCOUNT_NOT_FOUND) when provided. */
  code?: string;
}

const GENERIC = 'Something went wrong. Please try again.';

const NO_ACCOUNT_MESSAGE =
  'No account found with this email. Please create an account to continue.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const ACCOUNT_NOT_ACTIVE_MESSAGE =
  'Your account is not active. Please contact support to get help.';

/** Backend login failure codes mapped to copy that never reveals internals. */
const CODE_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_FOUND: NO_ACCOUNT_MESSAGE,
  INVALID_CREDENTIALS: INVALID_CREDENTIALS_MESSAGE,
  ACCOUNT_NOT_ACTIVE: ACCOUNT_NOT_ACTIVE_MESSAGE,
};

const NETWORK_HINTS = /failed to fetch|networkerror|load failed|fetch failed|econnrefused|socket/i;

function inferKind(message: string, status?: number): ApiErrorKind {
  if (status === 401) return 'session';
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

/** Session-expiry messaging returns a special kind so callers can redirect. */
function kindMessage(kind: ApiErrorKind, _status?: number): string {
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
      return INVALID_CREDENTIALS_MESSAGE;
    case 'conflict':
      return 'That already exists or is being used. Please try something else.';
    default:
      return GENERIC;
  }
}

/**
 * Parse any thrown value into a safe, human-friendly ApiErrorInfo.
 * Never exposes raw stack traces, Prisma errors, database names or tokens.
 *
 * A structured `code` on the error (ApiError.code / backend `code` field) takes
 * precedence so well-known failures map to precise copy. Otherwise the message
 * keywords and HTTP status drive the classification.
 */
export function parseApiError(error: unknown, status?: number): ApiErrorInfo {
  if (!error) return { kind: 'unknown', message: GENERIC };

  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);

  const statusCode =
    typeof status === 'number'
      ? status
      : typeof error === 'object' && error !== null && 'status' in error
        ? (error as any).status
        : undefined;
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as any).code
      : undefined;

  // Stable backend codes always win over message sniffing.
  if (typeof errorCode === 'string' && CODE_MESSAGES[errorCode]) {
    return {
      kind: 'auth',
      code: errorCode,
      message: CODE_MESSAGES[errorCode],
    };
  }

  // Trim technical prefixes so they never reach the user.
  const cleaned = raw
    .replace(/\s*\(\.\.\.\/.*\)$/s, '')
    .replace(/^PrismaClient\w*Error:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/\s+at\s+\S+.*$/s, '')
    .trim();

  const kind = inferKind(cleaned, statusCode);

  // The legacy "Invalid credentials" message from the login endpoint must never
  // render verbatim; translate it to the enumeration-safe copy.
  if (/invalid credentials/i.test(cleaned)) {
    return { kind: 'auth', message: INVALID_CREDENTIALS_MESSAGE };
  }

  // For auth/validation/conflict/not-found, prefer the server's own message
  // when it's short and specific, otherwise fall back to the kind message.
  const specificKinds: ApiErrorKind[] = ['auth', 'validation', 'conflict', 'not_found'];
  if (specificKinds.includes(kind)) {
    if (kind === 'auth') {
      return { kind: 'auth', message: INVALID_CREDENTIALS_MESSAGE };
    }
    const short = cleaned.length > 0 && cleaned.length <= 160;
    if (short && !NETWORK_HINTS.test(cleaned)) {
      const sentenceCased = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return { kind, message: sentenceCased };
    }
  }

  return { kind, message: kindMessage(kind, statusCode) };
}

/** True when the error indicates an expired/invalid session. */
export function isSessionError(error: unknown): boolean {
  return parseApiError(error, 401).kind === 'session';
}

/** Convenience: just get a friendly message string. */
export function getErrorMessage(error: unknown, status?: number): string {
  return parseApiError(error, status).message;
}
