'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

/**
 * Refer & Earn call-to-action. Routing follows the existing auth conventions:
 *  - logged out -> the register flow (a new visitor has no referral code yet)
 *  - logged in  -> their existing dashboard referral section
 * The button is purely navigational; no user-specific data is read or shown.
 */
export default function ReferAndEarnCta({
  label = 'Refer & Earn',
  size = 'lg',
  variant = 'gold',
  className = '',
}: {
  label?: string;
  size?: 'md' | 'lg';
  variant?: 'gold' | 'navy';
  className?: string;
}) {
  const { user, loading } = useAuth();
  const href = !loading && user ? '/dashboard/referrals' : '/register';

  const sizeClasses =
    size === 'lg' ? 'px-7 py-3.5 text-base' : 'px-5 py-3 text-sm';

  const variantClasses =
    variant === 'gold'
      ? 'bg-gradient-to-b from-[#D3A24C] to-[#B8832F] text-white shadow-[0_12px_30px_-12px_rgba(200,148,62,0.75)] ring-1 ring-inset ring-white/15 hover:from-[#DBAA55] hover:to-[#C08A32] focus-visible:ring-[#C8943E]'
      : 'bg-[#061B36] text-white shadow-sm hover:bg-[#061B36]/90 focus-visible:ring-[#C8943E]';

  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${sizeClasses} ${variantClasses} ${className}`}
    >
      {label}
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}
