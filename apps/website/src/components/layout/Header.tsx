'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { CloseIcon } from '@/components/ui';
import BrandLogo from '@/components/brand/BrandLogo';
import { scrollToAnchor } from '@/lib/scroll';

const navLinks = [
  { href: '#home', label: 'Home' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#free-preview', label: 'Free Preview' },
  { href: '#vaults', label: 'Opportunity Vaults' },
  { href: '#plans', label: 'Plans' },
  { href: '/upload-resume', label: 'Resume' },
  { href: '#faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact Us' },
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

function getProfileImageUrl(img: string | null | undefined) {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  // Profile images are served from /api/storage/
  return `${base}/storage/${img}`;
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hash, setHash] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => setUserMenuOpen(false), [pathname]);

  useEffect(() => {
    setHash(window.location.hash);
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleNav = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    setMobileOpen(false);
    setUserMenuOpen(false);
    const id = href.replace(/^#/, '');
    if (pathname === '/') {
      scrollToAnchor(id);
      window.history.replaceState(null, '', href);
      setHash(href);
    } else {
      router.push(`/${href}`);
    }
  };

  const isActive = (href: string) => {
    if (href.startsWith('#')) {
      if (pathname !== '/') return false;
      return href === '#home' ? !hash || hash === href : hash === href;
    }
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    `rounded-lg px-2 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
        : 'text-content-muted hover:bg-surface-muted hover:text-content'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <a
            href="#home"
            onClick={(e) => handleNav(e, '#home')}
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Gravitas Edge Consulting home"
          >
            <BrandLogo
              className="h-10 w-auto sm:h-12"
              nameClassName="hidden text-base font-bold tracking-tight text-content lg:inline lg:text-lg"
            />
          </a>
          <nav className="hidden items-center gap-x-1 lg:flex" aria-label="Primary">
            {navLinks.map((link) =>
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNav(e, link.href)}
                  className={navLinkClass(link.href)}
                >
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3 text-sm font-medium text-content hover:bg-surface-muted"
              >
                {user.profile?.profileImg ? (
                  <img
                    src={getProfileImageUrl(user.profile.profileImg) ?? undefined}
                    alt="Profile"
                    className="h-7 w-7 rounded-full border border-brand-200 object-cover dark:border-brand-800"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {initials(user.profile?.fullName, user.email)}
                  </span>
                )}
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
            <Link
              href="/login"
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          {/* Compact mobile: Free Preview → Sign In → Menu */}
          <a
            href="#free-preview"
            onClick={(e) => handleNav(e, '#free-preview')}
            className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
          >
            Free Preview
          </a>
          {user ? (
            <Link
              href="/dashboard"
              aria-label="Go to dashboard"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
            >
              {initials(user.profile?.fullName, user.email)}
            </Link>
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Sign In
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
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
                aria-hidden="true"
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
        <div className="border-t border-line bg-surface px-4 pb-6 pt-3 lg:hidden">
          <nav className="space-y-1" aria-label="Primary mobile" style={{ overflowWrap: 'anywhere' }}>
            {navLinks.map((link) =>
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNav(e, link.href)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium whitespace-normal break-words ${
                    isActive(link.href)
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-content-muted hover:bg-surface-muted hover:text-content'
                  }`}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium whitespace-normal break-words text-content-muted hover:bg-surface-muted hover:text-content"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
          <div className="my-2 flex items-center justify-between border-y border-line py-2.5">
            <span className="px-3 text-sm font-medium text-content">Appearance</span>
            <ThemeToggle />
          </div>
          {user ? (
            <>
              {userMenuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium whitespace-normal break-words text-content hover:bg-surface-muted"
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
            <div className="flex gap-3 pt-2">
              <Link
                href="/login"
                className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-center text-sm font-medium text-content hover:bg-surface-muted"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}