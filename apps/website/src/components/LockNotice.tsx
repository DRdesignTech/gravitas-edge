'use client';

import { LockIcon } from '@/components/ui';

export function LockNotice({
  message,
  tone = 'muted',
  className = '',
}: {
  message: string;
  tone?: 'muted' | 'gold';
  className?: string;
}) {
  const tones = {
    muted: 'border-dashed border-line bg-surface-muted/70 text-content-muted dark:bg-surface-muted/40',
    gold: 'border-[#C8943E]/40 bg-[#C8943E]/10 text-[#F1CE82]',
  } as const;
  return (
    <span
      role="note"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      <LockIcon className="h-3.5 w-3.5 shrink-0" />
      {message}
    </span>
  );
}
