import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // base32 (no confusable 0/O, 1/I)
const CODE_LENGTH = 10;
const PREFIX = 'REF-';

/**
 * Crypto-secure, collision-resistant referral code. Uses Node's CSPRNG and a
 * URL-safe base32 alphabet. Example: "REF-6Q3MX7K2TY".
 */
export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}${out}`;
}

export function buildReferralLink(baseUrl: string, code: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}?ref=${encodeURIComponent(code)}`;
}
