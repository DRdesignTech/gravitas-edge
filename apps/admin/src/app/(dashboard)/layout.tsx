'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Spinner } from '@/components/ui';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: 'dashboard' | 'chart' | 'users' | 'vault' | 'tag' | 'plan' | 'subs' | 'briefcase';
};

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', exact: true, icon: 'dashboard' },
  { href: '/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/users', label: 'Users', icon: 'users' },
  { href: '/vaults', label: 'Vaults', icon: 'vault' },
  { href: '/experience-levels', label: 'Experience Levels', icon: 'tag' },
  { href: '/plans', label: 'Plans', icon: 'plan' },
  { href: '/subscriptions', label: 'Subscriptions', icon: 'subs' },
  { href: '/opportunities', label: 'Opportunities', icon: 'briefcase' },
];

const iconPaths: Record<NavItem['icon'], string> = {
  dashboard:
    'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  chart:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  users:
    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  vault:
    'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
  tag: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z',
  plan: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
  subs: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  briefcase:
    'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
};

function NavIcon({ name }: { name: NavItem['icon'] }) {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[name]} />
    </svg>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: (typeof nav)[number];
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
          : 'text-content-muted hover:bg-surface-muted hover:text-content dark:hover:bg-line/50'
      }`}
    >
      <NavIcon name={item.icon} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, admin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !admin)) {
      router.replace('/login');
    }
  }, [loading, user, admin, router]);

  const current = useMemo(() => {
    const match = nav.find((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href),
    );
    return match?.label ?? 'Dashboard';
  }, [pathname]);

  if (loading || !user || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-brand-600 dark:text-brand-400">
        <Spinner className="h-9 w-9" />
      </div>
    );
  }

  const initials = (user.profile?.fullName || user.email)?.[0]?.toUpperCase() ?? 'A';
  const displayName = user.profile?.fullName || user.email;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 items-center gap-2.5 border-b border-line px-3 ${collapsed ? 'justify-center' : ''}`}
      >
        {collapsed ? (
          <BrandLogo className="h-9 w-auto" showName={false} />
        ) : (
          <>
            <BrandLogo className="h-9 w-auto shrink-0" showName={false} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-content">{BRAND_NAME}</p>
              <p className="truncate text-[11px] text-content-muted">Admin Console</p>
            </div>
          </>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <SidebarLink
              key={item.href}
              item={item}
              active={active}
              collapsed={collapsed}
              onClick={() => setMobileOpen(false)}
            />
          );
        })}
      </nav>
      <div
        className={`border-t border-line p-3 ${collapsed ? 'flex flex-col items-center gap-3' : ''}`}
      >
        {collapsed ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {initials}
          </span>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-content">{displayName}</p>
              <p className="truncate text-xs text-content-faint">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`mt-3 w-full rounded-lg border border-line-strong px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-line dark:hover:bg-red-500/10 ${
            collapsed ? 'flex justify-center px-0' : ''
          }`}
          title="Logout"
        >
          {collapsed ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          ) : (
            'Logout'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted dark:bg-surface">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface transition-[width] duration-200 dark:bg-surface-elevated lg:block ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-pop dark:bg-surface-elevated">
            {sidebar}
          </aside>
        </div>
      )}

      <div
        className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur dark:bg-surface/80 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-content-muted hover:bg-surface-muted hover:text-content lg:hidden"
            aria-label="Open menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 text-content-muted transition hover:bg-surface-muted hover:text-content lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-content">{current}</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
