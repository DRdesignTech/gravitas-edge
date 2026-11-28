'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Opportunity } from '@/lib/types';
import ScrollReveal from './ScrollReveal';
import {
  HiBriefcase,
  HiBuildingOffice2,
  HiClock,
  HiLockClosed,
  HiLockOpen,
  HiSparkles,
  HiArrowRight,
  HiShieldCheck,
  HiBanknotes,
} from 'react-icons/hi2';

const COUNTRY_FLAGS: Record<string, string> = {
  'United Arab Emirates': '🇦🇪',
  UAE: '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  Singapore: '🇸🇬',
  'United Kingdom': '🇬🇧',
  UK: '🇬🇧',
  Germany: '🇩🇪',
  Qatar: '🇶🇦',
  Kenya: '🇰🇪',
  Canada: '🇨🇦',
  'United States': '🇺🇸',
  USA: '🇺🇸',
  US: '🇺🇸',
  India: '🇮🇳',
  Australia: '🇦🇺',
  Oman: '🇴🇲',
  Nigeria: '🇳🇬',
};

function formatExp(o: Opportunity): string {
  if ((o as Opportunity & { experienceText?: string }).experienceText) {
    return (o as Opportunity & { experienceText?: string }).experienceText!;
  }
  if (o.minExperience && o.maxExperience) {
    return `${o.minExperience}–${o.maxExperience} yrs`;
  }
  if (o.minExperience) {
    return `${o.minExperience}+ yrs`;
  }
  return 'Executive Level';
}

function formatAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Recently added';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return 'Active';
}

export default function PreviewOpportunityCard3D({
  o,
  idx,
  onUnlock,
}: {
  o: Opportunity;
  idx: number;
  onUnlock: (opp: Opportunity) => void;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });
  const [saved, setSaved] = useState(false);

  const country = o.country || (o.location?.includes(',') ? o.location.split(',')[1].trim() : '');
  const city = o.location ? o.location.split(/[/,]/)[0].trim() : '';
  const flag = (country && COUNTRY_FLAGS[country]) || '🌐';
  const hasDirectContact = Boolean(o.applicationContact || o.applicationUrl);
  const cardVaults = o.vaults && o.vaults.length > 0 ? o.vaults : [];

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 9,
      ry: (px - 0.5) * 9,
      mx: px * 100,
      my: py * 100,
      hovering: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });
  };

  return (
    <ScrollReveal delay={(idx % 3) * 80} className="h-full">
      <div style={{ perspective: '1100px' }} className="h-full">
        <div
          onMouseEnter={() => setTilt((prev) => ({ ...prev, hovering: true }))}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transformStyle: 'preserve-3d',
            transform: tilt.hovering
              ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-7px)`
              : 'rotateX(0deg) rotateY(0deg) translateY(0px)',
            transition: tilt.hovering
              ? 'transform 120ms ease-out, border-color 300ms, box-shadow 300ms'
              : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms, box-shadow 300ms',
          }}
          className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-[#E9E5DC] bg-gradient-to-b from-white via-white to-[#FAF8F5]/90 p-5 sm:p-6 text-left shadow-[0_14px_34px_-20px_rgba(6,27,54,0.24)] hover:border-[#D6952F] hover:shadow-[0_28px_56px_-20px_rgba(6,27,54,0.28)] dark:border-white/10 dark:from-[#0E2442] dark:via-[#0C1E38] dark:to-[#08172C] dark:hover:border-[#D6952F]/75 dark:hover:shadow-[0_28px_56px_-20px_rgba(0,0,0,0.7)]"
        >
          {/* Cursor-following radial gold spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[24px] transition-opacity duration-300"
            style={{
              opacity: tilt.hovering ? 1 : 0,
              background: `radial-gradient(300px circle at ${tilt.mx}% ${tilt.my}%, rgba(214, 149, 47, 0.16), transparent 70%)`,
            }}
          />

          {/* Diagonal light sheen sweep on hover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100 dark:via-white/10"
          />

          {/* Top gold gradient bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#061B36] via-[#D6952F] to-[#061B36] opacity-25 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
            {/* Top Header Row */}
            <div
              className="flex items-center justify-between gap-2"
              style={{ transform: 'translateZ(22px)' }}
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-2xs transition-transform duration-300 group-hover:scale-[1.03] dark:text-emerald-400"
              >
                <span className="text-sm leading-none">{flag}</span>
                <span className="truncate max-w-[155px]">
                  {city ? `${city}, ` : ''}
                  {country || 'Global'}
                </span>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>

                <button
                  type="button"
                  onClick={() => setSaved((prev) => !prev)}
                  aria-label={saved ? 'Remove bookmark' : 'Bookmark role'}
                  title={saved ? 'Shortlisted' : 'Shortlist role'}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-all cursor-pointer ${
                    saved
                      ? 'border-[#D6952F] bg-[#D6952F] text-[#061B36] shadow-xs'
                      : 'border-[#E9E5DC] bg-[#FAF8F5] text-[#5B6479] hover:border-[#D6952F] hover:text-[#D6952F] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                  }`}
                >
                  <HiSparkles className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Opportunity Title */}
            <h4
              className="mt-3.5 text-[1.06rem] font-extrabold leading-snug text-[#061B36] transition-colors group-hover:text-[#B37517] dark:text-[#F2F5FA] dark:group-hover:text-[#F0C27B] line-clamp-2"
              style={{ transform: 'translateZ(26px)' }}
            >
              <Link href={`/opportunities/${o.id}`} className="hover:underline">
                {o.title}
              </Link>
            </h4>

            {/* Structured 2x2 Metadata Grid */}
            <div
              className="mt-3.5 grid grid-cols-2 gap-2 text-[11.5px]"
              style={{ transform: 'translateZ(15px)' }}
            >
              {o.industry && (
                <div className="flex items-center gap-1.5 rounded-xl border border-[#E9E5DC]/80 bg-[#FAF8F5]/80 px-2.5 py-1.5 text-[#4A5568] dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-300">
                  <HiBuildingOffice2 className="h-3.5 w-3.5 shrink-0 text-[#D6952F]" />
                  <span className="truncate font-medium">{o.industry}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-xl border border-[#E9E5DC]/80 bg-[#FAF8F5]/80 px-2.5 py-1.5 text-[#4A5568] dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-300">
                <HiBriefcase className="h-3.5 w-3.5 shrink-0 text-[#D6952F]" />
                <span className="truncate font-medium">{formatExp(o)}</span>
              </div>
              {o.employmentType && (
                <div className="flex items-center gap-1.5 rounded-xl border border-[#E9E5DC]/80 bg-[#FAF8F5]/80 px-2.5 py-1.5 text-[#4A5568] dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-300">
                  <HiShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate font-medium">{o.employmentType}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-xl border border-[#E9E5DC]/80 bg-[#FAF8F5]/80 px-2.5 py-1.5 text-[#4A5568] dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-300">
                <HiClock className="h-3.5 w-3.5 shrink-0 text-[#8C9AC0]" />
                <span className="truncate font-medium">{formatAgo(o.createdAt || o.publishedDate)}</span>
              </div>
            </div>

            {/* Executive Compensation Strip */}
            <div
              className="mt-3.5 relative overflow-hidden rounded-2xl border border-[#D6952F]/35 bg-gradient-to-r from-[#061B36] to-[#0D2B52] px-3.5 py-2.5 text-white shadow-xs"
              style={{ transform: 'translateZ(20px)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[9.5px] font-bold uppercase tracking-widest text-[#F0C27B]/85">
                    Compensation Package
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-extrabold text-white">
                    <HiBanknotes className="h-4 w-4 shrink-0 text-[#F0C27B]" />
                    <span className="truncate">
                      {o.salary ? o.salary : 'Executive Package · Tier Protected'}
                    </span>
                  </span>
                </div>
                <span className="shrink-0 rounded-lg border border-[#F0C27B]/35 bg-[#D6952F]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F0C27B]">
                  {o.currency || 'Global'}
                </span>
              </div>
            </div>

            {/* Associated Vault Channels */}
            {cardVaults.length > 0 && (
              <div
                className="mt-3 flex flex-wrap gap-1.5"
                style={{ transform: 'translateZ(12px)' }}
              >
                {cardVaults.map((v) => (
                  <span
                    key={v.id}
                    className="rounded-full border border-[#E9E5DC] bg-white px-2.5 py-0.5 text-[10px] font-semibold text-content-muted dark:border-white/10 dark:bg-white/5"
                  >
                    {v.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Action Footer */}
          <div
            className="relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-[#E9E5DC] pt-3.5 text-xs dark:border-white/10"
            style={{ transform: 'translateZ(24px)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#D6952F]/15 text-[#B37517] transition-transform duration-300 group-hover:scale-110 dark:text-[#F0C27B]">
                {tilt.hovering ? (
                  <HiLockOpen className="h-3.5 w-3.5" />
                ) : (
                  <HiLockClosed className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-[#061B36] dark:text-slate-200">
                  {hasDirectContact ? 'Direct Hiring Contact' : 'Application Pathway'}
                </span>
                <span className="block truncate text-[10px] text-[#8C9AC0]">
                  {hasDirectContact ? 'Verified decision-maker' : 'Official executive route'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUnlock(o)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D6952F] to-[#E5A944] px-3.5 py-2 text-xs font-extrabold text-[#061B36] shadow-sm transition-all duration-200 hover:from-[#E5A944] hover:to-[#F0C27B] hover:shadow-md active:scale-[0.97] cursor-pointer"
            >
              <HiLockOpen className="h-3.5 w-3.5" />
              <span>Unlock</span>
              <HiArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
