export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function titleCase(value?: string | null): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function experienceLabel(min?: number | null, max?: number | null): string {
  if (min === undefined || min === null) return 'Not specified';
  if (max !== undefined && max !== null) return `${min}–${max} yrs`;
  return `${min}+ yrs`;
}

/**
 * Prefer the raw experience text from the API (e.g. "3+ Years",
 * "Multiple domain, across experience level") and fall back to the
 * structured min/max label when no text is provided.
 */
export function displayExperience(
  experienceText?: string | null,
  min?: number | null,
  max?: number | null,
): string {
  const text = experienceText?.trim();
  if (isMeaningful(text)) return text;
  return experienceLabel(min, max);
}

export function hasExperience(
  experienceText?: string | null,
  min?: number | null,
  max?: number | null,
): boolean {
  return Boolean(
    isMeaningful(experienceText) ||
      (min !== undefined && min !== null) ||
      (max !== undefined && max !== null),
  );
}

const EMPTY_PLACEHOLDERS = new Set([
  'not mentioned',
  'not specified',
  'not provided',
  'not given',
  'not available',
  'n/a',
  'na',
  'none',
  'nil',
  'unknown',
  'tbd',
  'to be determined',
  'to be announced',
  '-',
  '—',
  '–',
]);

/**
 * Returns true when the value actually contains meaningful content.
 * Placeholder strings like "Not Mentioned", "N/A" or "—" are treated
 * as empty so UI elements can hide instead of showing noise.
 */
export function isMeaningful(value?: string | null): value is string {
  const v = value?.trim().toLowerCase() ?? '';
  if (!v) return false;
  return !EMPTY_PLACEHOLDERS.has(v);
}
