'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/auth';

const nav = [
  { href: '/dashboard', label: 'Dashboard', exact: true },
  { href: '/dashboard/profile', label: 'My Profile' },
  { href: '/dashboard/subscriptions', label: 'My Subscriptions' },
  { href: '/dashboard/vaults', label: 'My Vaults' },
  { href: '/dashboard/referrals', label: 'Referrals' },
];

/**
 * The RVA opportunities entry point is only shown to users with an active
 * Recruitment Vendor Access plan; it stays hidden otherwise.
 */
const RVA_NAV = { href: '/recruitment-vendor/jobs', label: 'RVA Opportunities' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasRvaAccess } = useAuth();

  const items = hasRvaAccess === true ? [...nav, RVA_NAV] : nav;

  return (
    <AuthGuard>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:px-8">
        <aside className="lg:w-60 lg:shrink-0">
          <nav className="flex flex-wrap gap-2 pb-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1 lg:pb-0">
            {items.map((item) => {
              const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-400 dark:text-[#061B36]'
                      : 'text-content-muted hover:bg-surface-muted hover:text-content'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </AuthGuard>
  );
}
