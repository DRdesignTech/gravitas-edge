const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,64}$/;
const ALLOWED_PASSWORD_CHARS = /^[A-Za-z\d@$!%*#?&]+$/;
const PASSWORD_SYMBOLS = '@ $ ! % * # ? &';

export const PASSWORD_REQUIREMENTS_TEXT = `Password must be 8–64 characters and include at least one letter, one number, and one special character (${PASSWORD_SYMBOLS}). Only letters, numbers, and those symbols are allowed.`;

export function getPasswordError(password: string): string | undefined {
  if (PASSWORD_PATTERN.test(password)) return undefined;
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 64) return 'Password must be at most 64 characters.';
  if (!ALLOWED_PASSWORD_CHARS.test(password))
    return `Password may only contain letters, numbers, and these symbols: ${PASSWORD_SYMBOLS}.`;
  if (!/[A-Za-z]/.test(password)) return 'Password must include at least one letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  return `Password must include at least one of these symbols: ${PASSWORD_SYMBOLS}.`;
}