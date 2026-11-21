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
    size === 'lg' ? 'px-7 py-3.5 text-sm sm:text-base' : 'px-5 py-2.5 text-xs sm:text-sm';

  const variantClasses =
    variant === 'gold'
      ? 'bg-[#D6952F] text-[#061B36] font-bold shadow-md hover:bg-[#E0A343] focus-visible:ring-[#D6952F] dark:bg-[#D6952F] dark:hover:bg-[#E0A343] dark:text-[#061B36]'
      : 'bg-[#061B36] text-white font-bold shadow-sm hover:bg-[#10243E] focus-visible:ring-[#D6952F] dark:bg-[#1D3B66] dark:hover:bg-[#254A7F]';

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
