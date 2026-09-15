import { ApiError } from './api';
import { getErrorMessage, parseApiError, isSessionError } from './errors';

/**
 * Frontend auth error-mapping tests. These lock in the UX contract for the
 * Sign In page: never surface raw API text, map login failures to clear copy,
 * and keep the "ACCOUNT_NOT_FOUND" signal available so the page can render a
 * "Create an account" CTA.
 */
describe('auth error mapping', () => {
  it('maps ACCOUNT_NOT_FOUND to the create-account copy (auth, not session)', () => {
    const err = new ApiError('No account found with this email.', 401, 'ACCOUNT_NOT_FOUND');
    const info = parseApiError(err);
    expect(info.kind).toBe('auth');
    expect(info.code).toBe('ACCOUNT_NOT_FOUND');
    expect(info.message).toBe(
      'No account found with this email. Please create an account to continue.',
    );
    expect(isSessionError(err)).toBe(false);
  });

  it('maps INVALID_CREDENTIALS to enum-safe copy', () => {
    const err = new ApiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    expect(getErrorMessage(err)).toBe('Invalid email or password.');
    expect(isSessionError(err)).toBe(false);
  });

  it('never renders the legacy raw "Invalid credentials" message', () => {
    const err = new ApiError('Invalid credentials', 401);
    expect(getErrorMessage(err)).toBe('Invalid email or password.');
  });

  it('never turns a bare 401 "Unauthorized" into a permission error', () => {
    // An unauthenticated 401 with no structured code is treated as a session
    // problem, never as "You don't have permission to do that."
    const err = new ApiError('Unauthorized', 401);
    expect(getErrorMessage(err)).toBe('Your session has expired. Please log in again.');
  });

  it('keeps a genuine 403 as a permission error', () => {
    const err = new ApiError('Forbidden resource', 403);
    expect(getErrorMessage(err)).toBe("You don't have permission to do that.");
  });

  it('maps a real session-expiry 401 (with a token) to session copy', () => {
    const err = new ApiError('Invalid token', 401);
    expect(isSessionError(err)).toBe(true);
    expect(getErrorMessage(err)).toBe('Your session has expired. Please log in again.');
  });

  it('maps ACCOUNT_NOT_ACTIVE to support-help copy', () => {
    const err = new ApiError('Account is not active', 401, 'ACCOUNT_NOT_ACTIVE');
    const info = parseApiError(err);
    expect(info.kind).toBe('auth');
    expect(info.message).toBe(
      'Your account is not active. Please contact support to get help.',
    );
  });

  it('falls back to generic copy for unknown errors', () => {
    expect(getErrorMessage('some random text')).toBe('Something went wrong. Please try again.');
  });

  it('falls back to a network message for network failures', () => {
    expect(getErrorMessage('TypeError: Failed to fetch')).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    );
  });
});