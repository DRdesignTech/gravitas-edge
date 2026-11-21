'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { BRAND_LOGO_SRC } from '@/lib/brand';
import { scrollToAnchor } from '@/lib/scroll';
import AuthModal from '@/components/auth/AuthModal';

interface NavLinkItem {
  href: string;
  label: string;
  key: string;
}

const navLinks: NavLinkItem[] = [
  { href: '#home', label: 'Home', key: 'home' },
  { href: '#how-it-works', label: 'How It Works', key: 'how' },
  { href: '#free-preview', label: 'Free Preview', key: 'preview' },
  { href: '#vaults', label: 'Opportunity Vaults', key: 'vaults' },
  { href: '#plans', label: 'Plans', key: 'plans' },
  { href: '/recruitment-vendor', label: 'Recruitment Vendor', key: 'vendor' },
  { href: '#faq', label: 'FAQ', key: 'faq' },
  { href: '/contact', label: 'Contact Us', key: 'contact' },
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
  return `${base}/storage/${img}`;
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const menuRef = useRef<HTMLDivElement>(null);
  const spyLocked = useRef(false);
  const lockedTarget = useRef<string | null>(null);
  const spyUnlockTimer = useRef<number | null>(null);
  const navScrollTimer = useRef<number | null>(null);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => setUserMenuOpen(false), [pathname]);

  // Scroll spy — tracks the section currently in view so the active highlight follows scrolling
  useEffect(() => {
    if (pathname !== '/') {
      if (pathname.startsWith('/recruitment-vendor')) {
        setActiveSection('vendor');
      } else if (pathname.startsWith('/contact')) {
        setActiveSection('contact');
      } else {
        setActiveSection('');
      }
      return;
    }

    const sectionMapping: { id: string; key: string }[] = [
      { id: 'home', key: 'home' },
      { id: 'how-it-works', key: 'how' },
      { id: 'free-preview', key: 'preview' },
      { id: 'vaults', key: 'vaults' },
      { id: 'plans', key: 'plans' },
      { id: 'faq', key: 'faq' },
    ];

    const update = () => {
      if (spyLocked.current) {
        const target = lockedTarget.current ? document.getElementById(lockedTarget.current) : null;
        const top = target ? target.getBoundingClientRect().top : NaN;
        if (!target || (top > 24 && top < 120)) {
          spyLocked.current = false;
        } else {
          return;
        }
      }

      const offset = 90;
      const entries = sectionMapping
        .map(({ id, key }) => {
          const el = document.getElementById(id);
          return el ? { id, key, top: el.getBoundingClientRect().top } : null;
        })
        .filter((e): e is { id: string; key: string; top: number } => e !== null);

      if (!entries.length) return;

      let currentKey = entries[0].key;
      let closest = -Infinity;
      let lowestKey = entries[0].key;
      let lowestTop = -Infinity;

      for (const { key, top } of entries) {
        if (top > lowestTop) {
          lowestTop = top;
          lowestKey = key;
        }
        if (top <= offset && top > closest) {
          closest = top;
          currentKey = key;
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5) {
        currentKey = lowestKey;
      }
      setActiveSection(currentKey);
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

    if (pathname !== '/') {
      router.push(`/${href}`);
      return;
    }

    e.preventDefault();
    const id = href.replace(/^#/, '');
    const matched = navLinks.find((l) => l.href === href);
    if (matched) {
      setActiveSection(matched.key);
    }
    spyLocked.current = true;
    lockedTarget.current = id;
    if (spyUnlockTimer.current) window.clearTimeout(spyUnlockTimer.current);
    spyUnlockTimer.current = window.setTimeout(() => {
      spyLocked.current = false;
    }, 1200);

    if (navScrollTimer.current) window.clearTimeout(navScrollTimer.current);
    navScrollTimer.current = window.setTimeout(() => {
      scrollToAnchor(id);
      window.history.replaceState(null, '', href);
    }, 10);
  };

  const isActive = (link: NavLinkItem) => {
    if (link.href.startsWith('#')) {
      if (pathname !== '/') return false;
      return activeSection === link.key;
    }
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FEFDF9]/95 dark:bg-[#06142A]/95 backdrop-blur-[10px] border-b border-[#E9E5DC] dark:border-[#1E3557]">
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center gap-[14px] px-5">
        <Link
          href="/#home"
          onClick={(e) => handleSectionNav(e, '#home')}
          className="flex items-center gap-[14px] font-extrabold text-[1.05rem] text-[#061B36] dark:text-[#F2F5FA] no-underline cursor-pointer shrink-0"
          aria-label="Gravitas Edge Consulting home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-[42px] w-auto block dark:bg-white dark:rounded-lg dark:px-1 dark:py-0.5"
            src={BRAND_LOGO_SRC}
            alt="Gravitas Edge Consulting logo"
            width={143}
            height={46}
          />
          <span className="font-bold text-[1rem] text-[#061B36] dark:text-[#F2F5FA] whitespace-nowrap tracking-[-0.01em] max-[620px]:hidden min-[1121px]:max-[1270px]:hidden">
            Gravitas Edge Consulting
          </span>
        </Link>

        <nav
          id="nav"
          aria-label="Primary"
          className={`min-[1121px]:flex min-[1121px]:static min-[1121px]:bg-transparent min-[1121px]:flex-row min-[1121px]:p-0 min-[1121px]:border-0 min-[1121px]:items-center min-[1121px]:gap-[2px] min-[1121px]:ml-auto min-[1121px]:mr-[10px] max-[1120px]:absolute max-[1120px]:top-[68px] max-[1120px]:left-0 max-[1120px]:right-0 max-[1120px]:bg-white max-[1120px]:dark:bg-[#0C1E38] max-[1120px]:flex-col max-[1120px]:p-[12px_20px] max-[1120px]:border-b max-[1120px]:border-[#E9E5DC] max-[1120px]:dark:border-[#1E3557] max-[1120px]:shadow-lg max-[1120px]:z-40 ${
            mobileOpen ? 'max-[1120px]:flex max-[1120px]:items-stretch' : 'max-[1120px]:hidden'
          }`}
        >
          {navLinks.map((link) => {
            const active = isActive(link);
            return (
              <button
                key={link.href}
                type="button"
                data-nav={link.key}
                className={`font-sans rounded-[8px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer min-[1121px]:py-[6px] min-[1121px]:px-[8px] min-[1121px]:text-[0.77rem] min-[1121px]:leading-[1.55] max-[1120px]:text-left max-[1120px]:text-[0.92rem] max-[1120px]:py-[10px] max-[1120px]:px-[12px] ${
                  active
                    ? 'bg-[#FBF0DE] border border-[#E0A85A] text-[#061B36] dark:bg-[#D6952F]/[0.16] dark:border-[#E0A85A] dark:text-[#F6D58A]'
                    : 'bg-transparent border border-transparent text-[#061B36] dark:text-[#F2F5FA] hover:bg-[#D6952F]/[0.08] dark:hover:bg-[#D6952F]/[0.12]'
                }`}
                onClick={(e) => {
                  if (link.href.startsWith('#')) {
                    handleSectionNav(e, link.href);
                  } else {
                    setMobileOpen(false);
                    router.push(link.href);
                  }
                }}
              >
                {link.label}
              </button>
            );
          })}

          {/* Mobile extra items */}
          {mobileOpen && (
            <div className="mt-2 pt-3 border-t border-[#E9E5DC] dark:border-[#1E3557] flex flex-col gap-1 min-[1121px]:hidden">
              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-[0.92rem] font-medium text-[#061B36] dark:text-[#F2F5FA]">
                  Appearance
                </span>
                <ThemeToggle />
              </div>
              {user ? (
                <>
                  {userMenuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-left text-[0.92rem] font-medium py-[10px] px-[12px] rounded-lg text-[#5B6479] dark:text-[#93A3BE] hover:bg-[#D6952F]/[0.08] hover:text-[#061B36] dark:hover:text-[#F2F5FA]"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="text-left text-[0.92rem] font-semibold py-[10px] px-[12px] rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-[#061B36] hover:bg-[#10243E] dark:bg-[#1D3B66] dark:hover:bg-[#26497C] text-white font-bold text-[0.88rem] py-[10px] px-[18px] text-center mt-2 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center gap-[10px] max-[1120px]:ml-auto shrink-0">
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className="flex max-w-[170px] items-center gap-2 rounded-full border border-[#E9E5DC] dark:border-[#1E3557] bg-white dark:bg-[#0C1E38] py-1.5 pl-1.5 pr-3 text-sm font-medium text-[#061B36] dark:text-[#F2F5FA] shadow-sm hover:bg-[#D6952F]/[0.08] transition-colors"
              >
                {user.profile?.profileImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getProfileImageUrl(user.profile.profileImg) ?? undefined}
                    alt="Profile"
                    className="h-7 w-7 shrink-0 rounded-full border border-[#D6952F] object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0C27B] text-xs font-bold text-[#061B36]">
                    {initials(user.profile?.fullName, user.email)}
                  </span>
                )}
                <span className="truncate">{user.profile?.fullName || 'Account'}</span>
                <svg
                  className="h-4 w-4 shrink-0 text-[#5B6479] dark:text-[#93A3BE]"
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
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-[#E9E5DC] dark:border-[#1E3557] bg-white dark:bg-[#0C1E38] shadow-lg z-50">
                  {userMenuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#5B6479] dark:text-[#93A3BE] transition-colors hover:bg-[#D6952F]/[0.08] hover:text-[#061B36] dark:hover:text-[#F2F5FA] focus-visible:outline-none"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-[#E9E5DC] dark:border-[#1E3557]" />
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full bg-[#061B36] hover:bg-[#10243E] dark:bg-[#1D3B66] dark:hover:bg-[#26497C] text-white font-bold text-[0.85rem] leading-[1.55] px-[14px] py-[8px] whitespace-nowrap transition-colors no-underline max-[1120px]:hidden cursor-pointer"
            >
              Sign In
            </button>
          )}
          <button
            type="button"
            className="hidden max-[1120px]:block bg-transparent border-0 text-[1.5rem] leading-none text-[#061B36] dark:text-[#F2F5FA] cursor-pointer p-1"
            id="burger"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="signin"
      />
    </header>
  );
}
