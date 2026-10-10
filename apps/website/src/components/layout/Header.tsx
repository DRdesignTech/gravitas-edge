'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { CloseIcon } from '@/components/ui';
import BrandLogo from '@/components/brand/BrandLogo';
import { scrollToAnchor } from '@/lib/scroll';

const navLinks = [
  { href: '#home', label: 'Home' },
  { href: '#free-preview', label: 'Free Preview' },
  { href: '#vaults', label: 'Opportunity Vaults' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#plans', label: 'Plans' },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const menuRef = useRef<HTMLDivElement>(null);
  const spyLocked = useRef(false);
  const lockedTarget = useRef<string | null>(null);
  const spyUnlockTimer = useRef<number | null>(null);
  const navScrollTimer = useRef<number | null>(null);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => setUserMenuOpen(false), [pathname]);

  // Scroll spy — tracks the section currently in view so the active highlight
  // follows scrolling (e.g. it returns to Home when scrolled back to the top).
  useEffect(() => {
    if (pathname !== '/') return;
    const ids = navLinks.filter((l) => l.href.startsWith('#')).map((l) => l.href.slice(1));

    const update = () => {
      // While a nav tap is programmatically scrolling, keep the tapped link
      // highlighted and ignore scroll updates until the target is reached.
      if (spyLocked.current) {
        const target = lockedTarget.current ? document.getElementById(lockedTarget.current) : null;
        const top = target ? target.getBoundingClientRect().top : NaN;
        if (!target || (top > 24 && top < 104)) {
          spyLocked.current = false;
        } else {
          return;
        }
      }
      const offset = 88;
      // Resolve elements on every run — sections can be replaced after data loads.
      const entries = ids
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top } : null;
        })
        .filter((e): e is { id: string; top: number } => e !== null);
      if (!entries.length) return;

      let current = entries[0].id;
      let closest = -Infinity;
      let lowest = entries[0].id;
      let lowestTop = -Infinity;
      for (const { id, top } of entries) {
        if (top > lowestTop) {
          lowestTop = top;
          lowest = id;
        }
        if (top <= offset && top > closest) {
          closest = top;
          current = id;
        }
      }
      // When the page is scrolled to the very bottom the last section may not
      // reach the offset — highlight it regardless.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = lowest;
      }
      setActiveSection(current);
    };

    const release = () => {
      spyLocked.current = false;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchstart', release, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchstart', release);
    };
  }, [pathname]);

  useEffect(
    () => () => {
      if (spyUnlockTimer.current) window.clearTimeout(spyUnlockTimer.current);
      if (navScrollTimer.current) window.clearTimeout(navScrollTimer.current);
    },
    [],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSectionNav = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith('#')) return;
    setMobileOpen(false);
    setUserMenuOpen(false);
    // On the homepage section links scroll in-page and only sync the URL hash
    // (replaceState — no extra history entry). From any other route we let the
    // Next.js <Link> perform a normal single history navigation.
    if (pathname !== '/') return;
    e.preventDefault();
    const id = href.replace(/^#/, '');
    // Keep the tapped link highlighted while the programmatic scroll runs.
    spyLocked.current = true;
    lockedTarget.current = id;
    setActiveSection(id);
    if (spyUnlockTimer.current) window.clearTimeout(spyUnlockTimer.current);
    spyUnlockTimer.current = window.setTimeout(() => {
      spyLocked.current = false;
    }, 1200);
    // Collapsing the mobile menu changes the header height and shifts the page,
    // so wait a tick for layout to settle before measuring the scroll target.
    if (navScrollTimer.current) window.clearTimeout(navScrollTimer.current);
    navScrollTimer.current = window.setTimeout(() => {
      scrollToAnchor(id);
      window.history.replaceState(null, '', href);
    }, 0);
  };

  const isActive = (href: string) => {
    if (href.startsWith('#')) {
      if (pathname !== '/') return false;
      return activeSection === href.slice(1);
    }
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    `rounded-lg px-1.5 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
      isActive(href)
        ? 'bg-[#FFF3D9] text-[#061B36] border border-[#C8943E] dark:bg-brand-950 dark:text-brand-200 dark:border-brand-500/60'
        : 'text-content-muted hover:bg-surface-muted hover:text-content hover:border hover:border-[#C8943E]/40 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/#home"
            onClick={(e) => handleSectionNav(e, '#home')}
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Gravitas Edge Consulting home"
          >
            <BrandLogo
              className="h-10 w-auto sm:h-12"
              nameClassName="hidden text-base font-bold tracking-tight text-content lg:inline lg:text-lg"
            />
          </Link>
          <nav className="hidden items-center gap-x-0.5 xl:flex" aria-label="Primary">
            {navLinks.map((link) =>
              link.href.startsWith('#') ? (
                <Link
                  key={link.href}
                  href={`/${link.href}`}
                  onClick={(e) => handleSectionNav(e, link.href)}
                  className={navLinkClass(link.href)}
                >
                  {link.label}
                </Link>
              ) : (
                <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-2.5 xl:flex xl:pl-8">
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className="flex max-w-[160px] items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3 text-sm font-medium text-content hover:bg-surface-muted"
              >
                {user.profile?.profileImg ? (
                  <img
                    src={getProfileImageUrl(user.profile.profileImg) ?? undefined}
                    alt="Profile"
                    className="h-7 w-7 shrink-0 rounded-full border border-brand-200 object-cover dark:border-brand-800"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {initials(user.profile?.fullName, user.email)}
                  </span>
                )}
                <span className="truncate">{user.profile?.fullName || 'Account'}</span>
                <svg
                  className="h-4 w-4 shrink-0 text-content-faint"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop dark:bg-surface-elevated">
                  {userMenuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2.5 text-sm text-content-muted transition-all duration-150 hover:bg-surface-muted hover:text-content focus-visible:outline-none focus-visible:bg-surface-muted focus-visible:text-content"
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
              className="rounded-xl bg-[#061B36] px-5 py-2.5 text-sm font-semibold text-[#FFFEFA] shadow-sm transition-colors hover:bg-[#071A35] dark:bg-brand-400 dark:text-[#061B36] dark:hover:bg-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 xl:hidden">
          {/* Compact mobile: Free Preview → Sign In → Menu */}
          <Link
            href="/#free-preview"
            onClick={(e) => handleSectionNav(e, '#free-preview')}
            className="relative whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold text-[#061B36] transition-all border border-transparent hover:border-[#C8943E] hover:bg-[#FFF3D9] dark:text-brand-200 dark:hover:border-brand-500/60 dark:hover:bg-brand-950"
          >
            Free Preview
          </Link>
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
              className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-400 dark:text-[#061B36]"
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
        <div className="border-t border-line bg-surface px-4 pb-6 pt-3 xl:hidden">
          <nav
            className="space-y-1"
            aria-label="Primary mobile"
            style={{ overflowWrap: 'anywhere' }}
          >
            {navLinks.map((link) =>
              link.href.startsWith('#') ? (
                <Link
                  key={link.href}
                  href={`/${link.href}`}
                  onClick={(e) => handleSectionNav(e, link.href)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium whitespace-normal break-words transition-all duration-200 ${
                    isActive(link.href)
                      ? 'bg-[#FFF3D9] text-[#061B36] border border-[#C8943E] dark:bg-brand-950 dark:text-brand-200 dark:border-brand-500/60'
                      : 'text-content-muted hover:bg-surface-muted hover:text-content hover:border hover:border-[#C8943E]/40 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E]'
                  }`}
                >
                  {link.label}
                </Link>
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
                className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-700 dark:bg-brand-400 dark:text-[#061B36]"
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
