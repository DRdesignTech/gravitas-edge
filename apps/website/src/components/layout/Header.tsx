'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { CloseIcon } from '@/components/ui';
import BrandLogo from '@/components/brand/BrandLogo';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/plans', label: 'Plans' },
];

const userMenuLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/profile', label: 'My Profile' },
  { href: '/dashboard/resumes', label: 'Resumes' },
  { href: '/dashboard/subscriptions', label: 'My Subscriptions' },
  { href: '/dashboard/vaults', label: 'My Vaults' },
  { href: '/dashboard/referrals', label: 'Referrals' },
];

function initials(name?: string | null, email?: string) {
  const emailFallback = email ?? '?';
  const src = name?.trim() || emailFallback;
  return src[0].toUpperCase();
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => setUserMenuOpen(false), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <BrandLogo
              className="h-10 w-auto"
              nameClassName="text-base font-bold tracking-tight text-content sm:text-lg"
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-content-muted hover:bg-surface-muted hover:text-content'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3 text-sm font-medium text-content hover:bg-surface-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {initials(user.profile?.fullName, user.email)}
                </span>
                <span className="max-w-[140px] truncate">
                  {user.profile?.fullName || user.email}
                </span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop dark:bg-surface-elevated">
                  {userMenuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2.5 text-sm text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-line" />
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-content-muted hover:bg-surface-muted hover:text-content"
          >
            {mobileOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-surface px-4 pb-6 pt-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(link.href)
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'text-content-muted hover:bg-surface-muted'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-2 border-t border-line" />
          {user ? (
            <>
              {userMenuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-content hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 rounded-xl border border-line bg-surface px-4 py-2 text-center text-sm font-medium text-content"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex-1 rounded-xl bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
