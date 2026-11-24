'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Opportunity, Vault, OpportunityQuery, PaginatedResult } from '@/lib/types';
import { Skeleton, ErrorState } from '@/components/ui';
import { fetchOpportunities } from '@/lib/services';
import Eyebrow from './Eyebrow';
import {
  HiBriefcase,
  HiBuildingOffice2,
  HiClock,
  HiLockClosed,
  HiLockOpen,
  HiSparkles,
  HiArrowRight,
  HiShieldCheck,
  HiXMark,
  HiMapPin,
  HiCheckBadge,
} from 'react-icons/hi2';

const COUNTRY_FLAGS: Record<string, string> = {
  'United Arab Emirates': '🇦🇪',
  'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Singapore': '🇸🇬',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Germany': '🇩🇪',
  'Qatar': '🇶🇦',
  'Kenya': '🇰🇪',
  'Canada': '🇨🇦',
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'US': '🇺🇸',
  'India': '🇮🇳',
  'Australia': '🇦🇺',
  'Oman': '🇴🇲',
  'Nigeria': '🇳🇬',
};

type PreviewTab = 'all' | 'global' | 'india';

const TABS: { key: PreviewTab; label: string; countSuffix?: string }[] = [
  { key: 'all', label: 'All Opportunities' },
  { key: 'global', label: 'International Corridors' },
  { key: 'india', label: 'India Hubs' },
];

function formatAgo(dateString?: string | null): string {
  if (!dateString) return 'Recent';
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(diffDays / 30);
  return `${months}m ago`;
}

function formatExp(o: Opportunity): string {
  if (o.minExperience != null && o.maxExperience != null) {
    return `${o.minExperience}–${o.maxExperience} yrs`;
  }
  if (o.minExperience != null) {
    return `${o.minExperience}+ yrs`;
  }
  if (o.maxExperience != null) {
    return `Up to ${o.maxExperience} yrs`;
  }
  if (o.experienceText) return o.experienceText;
  return 'Executive exp.';
}

export default function LiveFreePreview({
  vaults,
  loading: initialLoading,
  error: initialError,
  onRetry,
}: {
  vaults: Vault[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('all');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockOpportunity, setUnlockOpportunity] = useState<Opportunity | null>(null);

  const inFlightRef = useRef<Promise<void> | null>(null);

  const loadOpportunities = useCallback(async (opts: OpportunityQuery) => {
    if (inFlightRef.current) return;

    setLoading(true);
    setError(null);

    const promise = fetchOpportunities(opts)
      .then((data: PaginatedResult<Opportunity>) => {
        setOpportunities(data.items);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load opportunities');
        setOpportunities([]);
      })
      .finally(() => {
        setLoading(false);
        inFlightRef.current = null;
      });

    inFlightRef.current = promise;
    await promise;
  }, []);

  useEffect(() => {
    loadOpportunities({
      page: 1,
      limit: 30,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, [loadOpportunities]);

  const filteredOpportunities = useMemo(() => {
    let list = [...opportunities];
    if (activeTab === 'global') {
      list = list.filter((o) => o.country?.toLowerCase() !== 'india');
    } else if (activeTab === 'india') {
      list = list.filter((o) => o.country?.toLowerCase() === 'india');
    }
    return list.slice(0, 6);
  }, [opportunities, activeTab]);

  return (
    <section id="preview" className="relative py-[72px] bg-[#FEFDF9] dark:bg-[#06142A] scroll-mt-20">
      {/* Anchor for backwards compatibility */}
      <div id="free-preview" className="absolute -top-20" aria-hidden="true" />

      <div className="mx-auto max-w-[1240px] px-5">
        {/* Section Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D6952F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#D6952F]">
              <HiSparkles className="h-3.5 w-3.5 text-[#D6952F]" />
              Live Free Preview
            </span>
          </div>
          <h2 className="mt-2 font-bold tracking-[-0.02em] text-[#061B36] dark:text-[#F2F5FA] text-[clamp(1.7rem,3.4vw,2.5rem)] leading-[1.15] mb-2 font-sans">
            Recently Added Opportunities
          </h2>
          <p className="text-[#5B6479] dark:text-[#93A3BE] text-[1.05rem] max-w-[660px] mx-auto leading-[1.55]">
            A live preview of opportunities active across our career vaults right now. Direct recruiter contacts and full application details unlock with access.
          </p>
        </div>

        {/* Filter Segmented Tabs */}
        <div className="flex gap-2 justify-center flex-wrap my-[26px]">
          {TABS.map((t) => {
            const isSelected = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`inline-flex items-center gap-2 rounded-xl py-2 px-4 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  isSelected
                    ? 'bg-[#061B36] text-white shadow-md dark:bg-[#D6952F] dark:text-[#061B36]'
                    : 'bg-white dark:bg-[#0C1E38] border border-[#E9E5DC] dark:border-[#1E3557] text-[#061B36] dark:text-[#F2F5FA] hover:border-[#D6952F]/60 hover:bg-[#F8F7F3] dark:hover:bg-[#10243E]'
                }`}
              >
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F] dark:bg-[#061B36]" />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content State: Loading, Error, or Unique Cards Grid */}
        {loading || initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-[20px]" />
            ))}
          </div>
        ) : error || initialError ? (
          <div className="py-8">
            <ErrorState
              message={error || initialError}
              onRetry={() => {
                onRetry();
                loadOpportunities({ page: 1, limit: 30, sortBy: 'createdAt', sortOrder: 'desc' });
              }}
            />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="text-center py-12 text-[#5B6479] dark:text-[#93A3BE] text-[0.95rem] bg-white dark:bg-[#0C1E38] border border-[#E9E5DC] dark:border-[#1E3557] rounded-[20px] p-8">
            No live opportunities match this category right now.
          </div>
        ) : (
          /* Unique Executive Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOpportunities.map((o) => {
              const country = o.country || (o.location?.includes(',') ? o.location.split(',')[1].trim() : '');
              const city = o.location ? o.location.split(/[/,]/)[0].trim() : '';
              const isIndia = country.toLowerCase() === 'india';
              const flag = (country && COUNTRY_FLAGS[country]) || '🌐';
              const hasDirectContact = Boolean(o.applicationContact || o.applicationUrl);
              const cardVaults = o.vaults && o.vaults.length > 0 ? o.vaults : [];

              return (
                <div
                  key={o.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#E9E5DC] bg-white p-5 text-left transition-all duration-300 shadow-sm hover:-translate-y-1.5 hover:border-[#D6952F] hover:shadow-[0_16px_36px_-12px_rgba(6,27,54,0.14)] dark:border-white/10 dark:bg-[#0C1E38] dark:hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.5)]"
                >
                  <div>
                    {/* Top Header Row: Location Pill + Live Verified Badge (Zero raw IDs shown) */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isIndia
                            ? 'bg-[#FBF0DE] text-[#9C6424] dark:bg-[#C8943E]/15 dark:text-[#E3B968]'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        <span className="text-sm leading-none">{flag}</span>
                        <span>{city ? `${city}, ` : ''}{country || 'Global'}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        Live Role
                      </span>
                    </div>

                    {/* Opportunity Title */}
                    <h4 className="mt-3.5 text-[1.05rem] font-bold leading-snug text-[#061B36] transition-colors group-hover:text-[#D6952F] dark:text-[#F2F5FA] line-clamp-2">
                      <Link
                        href={`/opportunities/${o.id}`}
                        className="hover:underline"
                      >
                        {o.title}
                      </Link>
                    </h4>

                    {/* Metadata Attribute Chips with Official Vector Icons */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-content-muted">
                      {o.industry && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#061B36]/5 px-2 py-1 dark:bg-white/5">
                          <HiBuildingOffice2 className="h-3.5 w-3.5 text-[#C8943E]" />
                          {o.industry}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#061B36]/5 px-2 py-1 dark:bg-white/5">
                        <HiBriefcase className="h-3.5 w-3.5 text-[#C8943E]" />
                        {formatExp(o)}
                      </span>
                      {o.employmentType && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#061B36]/5 px-2 py-1 dark:bg-white/5">
                          <HiShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          {o.employmentType}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#061B36]/5 px-2 py-1 dark:bg-white/5">
                        <HiClock className="h-3.5 w-3.5 text-content-faint" />
                        {formatAgo(o.createdAt || o.publishedDate)}
                      </span>
                    </div>

                    {/* Compensation Tag */}
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-[#C8943E]/40 bg-[#FFF3D9]/30 px-3 py-2 text-xs dark:bg-[#C8943E]/10">
                      <span className="font-bold text-[#061B36] dark:text-[#E3B968]">
                        {o.salary ? o.salary : 'Executive Compensation · Tier Protected'}
                      </span>
                      <span className="text-[10px] font-semibold text-[#C8943E] uppercase tracking-wider">
                        {isIndia ? 'INR' : 'Global'}
                      </span>
                    </div>

                    {/* Associated Vault Channels */}
                    {cardVaults.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {cardVaults.map((v) => (
                          <span
                            key={v.id}
                            className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-semibold text-content-muted dark:bg-white/5"
                          >
                            {v.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Unique Action Footer with Secure Unlock */}
                  <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                    <div className="flex items-center gap-1.5 text-content-muted">
                      <HiLockClosed className="h-3.5 w-3.5 text-[#C8943E]" />
                      <span className="text-[11px] font-medium">
                        {hasDirectContact ? 'Direct Hiring Contact' : 'Application Pathway'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUnlockOpportunity(o)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#D6952F] px-3.5 py-1.5 text-xs font-bold text-[#061B36] shadow-sm transition-all hover:bg-[#C8842D] hover:shadow active:scale-[0.98] cursor-pointer"
                    >
                      <HiLockOpen className="h-3.5 w-3.5" />
                      Unlock Role
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search All Opportunities CTA */}
        <div className="text-center mt-[36px]">
          <Link
            href="/opportunities"
            className="inline-flex items-center justify-center gap-2 rounded-xl py-3 px-8 font-bold text-sm bg-[#061B36] hover:bg-[#10243E] text-white hover:shadow-[0_8px_24px_-6px_rgba(6,27,54,0.45)] transition-all cursor-pointer no-underline border border-[#D6952F]/40"
          >
            Search All Opportunities <HiArrowRight className="h-4 w-4 text-[#D6952F]" />
          </Link>
        </div>
      </div>

      {/* Unlock Role Modal */}
      {unlockOpportunity && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B36]/65 backdrop-blur-sm"
          onClick={() => setUnlockOpportunity(null)}
        >
          <div
            className="relative w-full max-w-[520px] rounded-[24px] bg-white dark:bg-[#0C1E38] p-6 shadow-2xl border border-[#E9E5DC] dark:border-[#1E3557]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setUnlockOpportunity(null)}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-[#5B6479] hover:text-[#061B36] dark:text-[#93A3BE] dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <HiXMark className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D6952F]/15 px-2.5 py-0.5 text-xs font-bold text-[#D6952F]">
                <HiLockOpen className="h-3.5 w-3.5" /> Role Unlock
              </span>
            </div>

            <h3 className="font-sans font-bold text-[1.25rem] text-[#061B36] dark:text-[#F2F5FA] leading-[1.2] pr-6">
              {unlockOpportunity.title}
            </h3>

            <p className="text-[0.88rem] text-[#5B6479] dark:text-[#93A3BE] mt-2 mb-4 flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-content">
                <HiMapPin className="h-3.5 w-3.5 text-[#D6952F]" />
                {unlockOpportunity.location || unlockOpportunity.country || 'Global'}
              </span>
              <span>·</span>
              <span className="font-semibold text-content">{formatExp(unlockOpportunity)}</span>
              {unlockOpportunity.industry && (
                <>
                  <span>·</span>
                  <span>{unlockOpportunity.industry}</span>
                </>
              )}
            </p>

            <p className="text-[0.92rem] text-[#1A2236] dark:text-[#DCE5F2] font-semibold mb-3">
              The{' '}
              {unlockOpportunity.applicationContact || unlockOpportunity.applicationUrl
                ? 'direct hiring manager contact'
                : 'exclusive application pathway'}{' '}
              for this role is available in:
            </p>

            <div className="space-y-2.5 mb-5">
              {(unlockOpportunity.vaults && unlockOpportunity.vaults.length > 0
                ? unlockOpportunity.vaults
                : vaults.slice(0, 3)
              ).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-[14px] border border-[#E9E5DC] dark:border-[#1E3557] bg-[#FEFDF9] dark:bg-[#10243E] transition hover:border-[#D6952F]"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block text-sm text-[#061B36] dark:text-[#F2F5FA] truncate">
                      {v.name}
                    </b>
                    <span className="text-xs text-[#5B6479] dark:text-[#93A3BE] block truncate mt-0.5">
                      {v.type === 'both' || v.type === 'premier'
                        ? 'India + International Corridors'
                        : v.type === 'india'
                          ? 'India Leadership Hubs'
                          : 'Global Talent Markets'}
                    </span>
                  </div>
                  <Link
                    href={`/opportunities/${unlockOpportunity.id}`}
                    className="inline-flex items-center justify-center rounded-xl py-2 px-4 text-xs font-bold bg-[#061B36] hover:bg-[#10243E] text-white transition-colors no-underline shrink-0 shadow-sm"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#5B6479] dark:text-[#93A3BE] leading-relaxed">
              Unlock the verified hiring contact or application link by accessing any of the relevant vaults above.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
