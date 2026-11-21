'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';

export interface PolicySectionItem {
  id: string;
  label: string;
  number?: string;
}

interface PolicyLayoutProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  sections?: PolicySectionItem[];
  children: ReactNode;
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#061B36] text-[#D4AF37] shadow-xl transition-all duration-200 hover:scale-110 hover:bg-[#0A2540] dark:bg-[#0B1C34] dark:hover:bg-[#10274A]"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}

export default function PolicyLayout({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections: explicitSections,
  children,
}: PolicyLayoutProps) {
  const [sections, setSections] = useState<PolicySectionItem[]>(explicitSections || []);
  const [activeId, setActiveId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hasScrolled = useRef(false);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  const companyBadge = eyebrow?.toLowerCase().includes('gravitas')
    ? eyebrow
    : `Gravitas Edge · ${eyebrow || 'Legal'}`;

  useEffect(() => {
    let secList = explicitSections;
    if (!secList || secList.length === 0) {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-policy-section="true"]')
      );
      secList = elements.map((el) => ({
        id: el.id,
        label: el.getAttribute('data-section-title') || '',
        number: el.getAttribute('data-section-number') || '',
      }));
      setSections(secList);
    }

    if (secList && secList.length > 0) {
      setActiveId((curr) => curr || secList![0].id);
    }

    const handleUserInteraction = () => {
      hasScrolled.current = true;
    };

    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('touchmove', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!hasScrolled.current) {
            ticking = false;
            return;
          }
          const allElements = Array.from(
            document.querySelectorAll<HTMLElement>('[data-policy-section="true"]')
          );
          if (allElements.length === 0) {
            ticking = false;
            return;
          }

          const scrollY = window.scrollY || window.pageYOffset;
          const innerHeight = window.innerHeight;
          const scrollHeight = document.documentElement.scrollHeight;

          if (scrollY + innerHeight >= scrollHeight - 40) {
            setActiveId(allElements[allElements.length - 1].id);
            ticking = false;
            return;
          }

          for (let i = allElements.length - 1; i >= 0; i--) {
            const el = allElements[i];
            const rect = el.getBoundingClientRect();
            if (rect.top <= 220) {
              setActiveId(el.id);
              ticking = false;
              return;
            }
          }

          setActiveId(allElements[0].id);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('touchmove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [explicitSections]);

  // Automatically scroll the sidebar's Progress Tracker so the active tab stays in view
  useEffect(() => {
    if (!activeId || !sidebarContainerRef.current) return;
    const container = sidebarContainerRef.current;
    const activeButton = container.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`);
    if (activeButton) {
      const buttonOffsetTop = activeButton.offsetTop;
      const buttonHeight = activeButton.offsetHeight;
      const containerHeight = container.clientHeight;
      const currentScrollTop = container.scrollTop;

      if (
        buttonOffsetTop < currentScrollTop + 30 ||
        buttonOffsetTop + buttonHeight > currentScrollTop + containerHeight - 30
      ) {
        const targetScrollTop = buttonOffsetTop - containerHeight / 2 + buttonHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      }
    }
  }, [activeId]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FAF9F6] text-[#334155] dark:bg-[#061426] dark:text-slate-300">
      {/* ── Highlighted Last Updated bar ── */}
      <div className="flex w-full items-center justify-center gap-2 border-b border-[#D4AF37]/20 bg-[#D4AF37]/10 px-6 py-3 lg:justify-end">
        <span className="text-xs font-semibold text-[#061B36] dark:text-slate-200">
          Last Updated · <span className="text-[#B8860B] dark:text-[#D4AF37]">{lastUpdated}</span>
        </span>
      </div>

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-start px-4 pt-8 pb-16 sm:px-6 lg:flex-row lg:px-12 lg:pt-12">
        {/* Sidebar */}
        <aside className="mb-8 hidden w-full lg:sticky lg:top-[100px] lg:mb-0 lg:flex lg:w-[320px] lg:flex-shrink-0 lg:flex-col lg:items-start lg:justify-start">
          <div
            ref={sidebarContainerRef}
            className="flex max-h-[calc(100vh-140px)] w-full flex-col items-start justify-start gap-4 overflow-y-auto rounded-[18px] border border-[#0A2540]/15 bg-white/80 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0B1C34]/85"
          >
            <div className="w-full">
              <div className="text-[10px] font-bold uppercase leading-[15px] tracking-[2.4px] text-[#B8860B] dark:text-[#D4AF37]">
                Progress Tracker
              </div>
            </div>

            <div className="flex w-full flex-col items-start justify-start gap-2">
              <div className="flex w-full items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#061B36] dark:text-white">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                <span className="truncate">{title}</span>
              </div>
              <div className="flex w-full flex-col items-start justify-start gap-1 border-l border-[#0A2540]/15 dark:border-white/10">
                {sections.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-tab-id={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={`w-full py-[6px] pl-[14px] text-left border-l-[2px] transition-colors ${
                        isActive
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`text-[13px] leading-[1.4] transition-colors ${
                          isActive
                            ? 'font-bold text-[#061B36] dark:text-[#F0C27B]'
                            : 'font-normal text-[#061B36]/65 dark:text-slate-400'
                        }`}
                      >
                        {item.number && <span className="mr-1.5 opacity-80">{item.number}</span>}
                        {item.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

       

        {/* Main Content Area */}
        <main className="flex w-full min-w-0 flex-1 flex-col items-start justify-start gap-8 lg:pl-10">
          {/* Header Banner */}
          <div className="relative flex w-full flex-col items-start justify-start gap-4 overflow-hidden rounded-[16px] bg-gradient-to-br from-[#061B36] via-[#092244] to-[#041022] px-6 py-10 shadow-xl sm:px-10 lg:py-14">
            <div className="flex flex-col items-start justify-start rounded-sm bg-[#D4AF37] px-2.5 py-0.5">
              <div className="text-[11px] font-bold uppercase leading-[16.5px] tracking-[3px] text-black">
                {companyBadge}
              </div>
            </div>
            <div className="w-full">
              <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-[42px] lg:text-[52px]">
                {title}.
              </h1>
            </div>
            {intro && (
              <div className="w-full max-w-[760px] text-sm leading-relaxed text-white/90 sm:text-base [&_a]:font-medium [&_a]:text-[#F0C27B] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-white">
                {intro}
              </div>
            )}
            <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          </div>

           {/* Mobile Quick Jump */}
        {sections.length > 0 && (
          <div className="mb-6 w-full lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3 text-xs font-bold text-[#061B36] dark:text-white"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                <span>Jump to Section ({sections.length} sections)</span>
              </span>
              <span>{mobileMenuOpen ? '▲' : '▼'}</span>
            </button>
            {mobileMenuOpen && (
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[#0A2540]/15 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#0B1C34]">
                {sections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#061B36] hover:bg-[#D4AF37]/10 dark:text-slate-200"
                  >
                    {item.number} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

          {/* Policy Sections */}
          <div className="flex w-full flex-col gap-7">{children}</div>

          {/* Footer Divider & Notice */}
          <div className="flex w-full flex-col items-center justify-start gap-4 pt-8">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <div className="text-center text-[11px] font-semibold uppercase tracking-[3px] text-[#061B36]/60 dark:text-slate-400">
              © Gravitas Edge Consulting · All Rights Reserved
            </div>
          </div>
        </main>
      </div>

      <ScrollToTopButton />
    </div>
  );
}

export function PolicySection({
  number,
  title,
  id,
  children,
}: {
  number: string;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  const cleanId =
    id || `sec-${number.replace(/\D/g, '') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section
      id={cleanId}
      data-policy-section="true"
      data-section-id={cleanId}
      data-section-title={title}
      data-section-number={number}
      className="relative flex w-full scroll-mt-28 flex-col items-start justify-start gap-5 rounded-[16px] border border-[#0A2540]/10 bg-white p-6 shadow-[0px_8px_20px_-10px_rgba(6,27,54,0.08),0px_30px_60px_-28px_rgba(6,27,54,0.18)] sm:p-9 dark:border-white/10 dark:bg-[#0B1C34]"
    >
      <div className="flex w-full flex-col items-start justify-start gap-2.5">
        <div className="flex flex-col items-start justify-start rounded-sm bg-[#D4AF37] px-2.5 py-0.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[2.2px] text-black">
            Section {number.replace(/\.$/, '')}
          </span>
        </div>
        <div className="flex w-full flex-col items-start justify-start pb-0.5">
          <h2 className="text-[22px] font-bold leading-tight text-[#061B36] sm:text-[26px] dark:text-white">
            {title}
          </h2>
        </div>
        <div className="h-[2px] w-16 bg-[#D4AF37]" />
      </div>

      <div className="w-full space-y-4">{children}</div>
    </section>
  );
}

export function PolicyText({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] leading-relaxed text-[#334155] dark:text-slate-300 [&_a]:font-medium [&_a]:text-[#061B36] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#B8860B] dark:[&_a]:text-[#F0C27B] dark:hover:[&_a]:text-white">
      {children}
    </p>
  );
}

export function PolicyList({ items }: { items: ReactNode[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-2 pl-6 text-[#334155] dark:text-slate-300">
      {items.map((item, i) => (
        <li key={i} className="text-[15px] leading-relaxed marker:text-[#D4AF37]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PolicySubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-2 text-[16.5px] font-bold text-[#061B36] dark:text-white">
      {children}
    </h3>
  );
}

interface ContactRow {
  label: string;
  value: string;
  href?: string;
}

export function PolicyContactBlock({ rows }: { rows: ContactRow[] }) {
  return (
    <div className="mt-2 w-full divide-y divide-[#0A2540]/10 overflow-hidden rounded-[14px] border border-[#0A2540]/15 bg-slate-50/60 dark:divide-white/10 dark:border-white/15 dark:bg-[#07172C]">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-[#8A6A14] dark:text-[#F0C27B]">
            {row.label}
          </dt>
          <dd className="text-[15px] font-medium text-[#061B36] dark:text-slate-200">
            {row.href ? (
              <a
                href={row.href}
                className="text-[#061B36] underline underline-offset-2 transition-colors hover:text-[#B8860B] dark:text-[#F0C27B] dark:hover:text-white"
              >
                {row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </div>
  );
}

export function PolicyCallout({
  badge = 'Important · Read Carefully',
  children,
}: {
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 flex w-full flex-col items-start justify-start gap-4 rounded-[14px] border border-[#D4AF37] bg-gradient-to-b from-[#FFFAF0] to-[#FFF6E0] p-5 shadow-sm sm:flex-row sm:p-6 dark:from-[#132844] dark:to-[#0D1C32]">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-sm font-bold text-black">
        !
      </div>
      <div className="flex flex-1 flex-col items-start justify-start gap-1">
        <div className="text-[10px] font-bold uppercase tracking-[2.2px] text-[#8A6A14] dark:text-[#F0C27B]">
          {badge}
        </div>
        <div className="text-[15px] font-semibold leading-relaxed text-[#061B36] dark:text-white">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PolicyDivider({ label }: { label?: string }) {
  return (
    <div className="flex w-full items-center justify-start gap-6 py-4">
      <div className="h-px flex-1 bg-[#061B36]/15 dark:bg-white/10" />
      {label && (
        <div className="text-[11px] font-semibold uppercase tracking-[3px] text-[#D4AF37]">
          {label}
        </div>
      )}
      <div className="h-px flex-1 bg-[#061B36]/15 dark:bg-white/10" />
    </div>
  );
}
