'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Opportunity, Vault, OpportunityQuery, PaginatedResult } from '@/lib/types';
import { Skeleton, ErrorState } from '@/components/ui';
import { fetchOpportunities } from '@/lib/services';
import Eyebrow from './Eyebrow';

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

const TABS: { key: PreviewTab; label: string }[] = [
  { key: 'all', label: 'Latest' },
  { key: 'global', label: 'International' },
  { key: 'india', label: 'India' },
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
  return 'Any exp.';
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

      <div className="mx-auto max-w-[1180px] px-5">
        {/* Section Header (.center) */}
        <div className="text-center">
          <Eyebrow>
            Live Free Preview
          </Eyebrow>
          <h2 className="font-bold tracking-[-0.02em] text-[#061B36] dark:text-[#F2F5FA] text-[clamp(1.7rem,3.4vw,2.5rem)] leading-[1.15] mb-2 font-sans">
            Recently added opportunities
          </h2>
          <p className="text-[#5B6479] dark:text-[#93A3BE] text-[1.05rem] max-w-[640px] mx-auto leading-[1.55]">
            A sample of what&apos;s in the vaults right now. Hiring contacts and full details unlock with a subscription.
          </p>
        </div>

        {/* Filter Tabs (.vtabs) */}
        <div className="flex gap-2 justify-center flex-wrap my-[26px]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-1.5 border rounded-full py-[5px] px-3.5 text-[0.82rem] font-semibold transition-colors cursor-pointer ${
                activeTab === t.key
                  ? 'bg-[#061B36] text-white border-[#061B36] dark:bg-[#10243E] dark:border-[#1E3557]'
                  : 'bg-white dark:bg-[#0C1E38] border-[#E9E5DC] dark:border-[#1E3557] text-[#061B36] dark:text-[#F2F5FA] hover:bg-[#F8F7F3] dark:hover:bg-[#10243E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content State: Loading, Error, or Grid */}
        {loading || initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[14px]" />
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
          <div className="text-center py-12 text-[#5B6479] dark:text-[#93A3BE] text-[0.95rem] bg-white dark:bg-[#0C1E38] border border-[#E9E5DC] dark:border-[#1E3557] rounded-[16px] p-8">
            No live opportunities match this category right now.
          </div>
        ) : (
          /* Cards Grid (.grid.cols-opp) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
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
                  className="bg-white dark:bg-[#0C1E38] border border-[#E9E5DC] dark:border-[#1E3557] border-l-4 border-l-[#22C55E] rounded-[14px] p-[18px] flex flex-col gap-2 hover:shadow-[0_10px_30px_-12px_rgba(6,27,54,0.18)] dark:hover:shadow-none transition-shadow"
                >
                  {/* Top row: Location tag + Job ID */}
                  <div className="flex justify-between items-start gap-2">
                    <span
                      className={`inline-block text-[0.72rem] font-bold py-[3px] px-[9px] rounded-[6px] ${
                        isIndia
                          ? 'bg-[#FBF0DE] text-[#9C6424]'
                          : 'bg-[rgba(34,197,94,0.14)] text-[#15803D] dark:text-[#22C55E]'
                      }`}
                    >
                      {flag} {city ? `${city}, ` : ''}{country || 'Global'}
                    </span>
                    <span className="font-mono text-[0.78rem] text-[#5B6479] dark:text-[#93A3BE] whitespace-nowrap">
                      {o.jobId || o.id}
                    </span>
                  </div>

                  {/* Title + Live badge row */}
                  <div className="flex justify-between items-start gap-2 mt-1">
                    <h4 className="text-[1.02rem] font-bold text-[#061B36] dark:text-[#F2F5FA] leading-[1.25] flex-1 min-w-0">
                      <Link
                        href={`/opportunities/${o.id}`}
                        className="hover:text-[#D6952F] transition-colors no-underline text-inherit"
                      >
                        {o.title}
                      </Link>
                    </h4>
                    <span className="inline-flex items-center gap-1.5 text-[0.74rem] font-extrabold text-[#15803D] dark:text-[#22C55E] bg-[rgba(34,197,94,0.14)] py-[3px] px-[9px] rounded-full tracking-[0.02em] shrink-0 select-none">
                      <span className="w-[7px] h-[7px] rounded-full bg-[#22C55E] animate-pulse" />
                      Live
                    </span>
                  </div>

                  {/* Metadata row (.meta) */}
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[0.84rem] text-[#5B6479] dark:text-[#93A3BE] mt-1">
                    {o.industry && <span>💼 {o.industry}</span>}
                    <span>⏳ {formatExp(o)}</span>
                    {o.employmentType && <span>🏢 {o.employmentType}</span>}
                    <span>🗓 {formatAgo(o.createdAt || o.publishedDate)}</span>
                  </div>

                  {/* Compensation row */}
                  {o.salary ? (
                    <div className="font-bold text-[#061B36] dark:text-[#F2F5FA] text-[0.9rem] mt-1">
                      {o.salary}
                    </div>
                  ) : (
                    <div className="text-[0.85rem] text-[#5B6479] dark:text-[#93A3BE] mt-1">
                      Compensation not disclosed
                    </div>
                  )}

                  {/* Vault tags row */}
                  {cardVaults.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {cardVaults.map((v) => (
                        <span
                          key={v.id}
                          className="inline-block text-[0.72rem] font-bold py-[3px] px-[9px] rounded-[6px] bg-[#E7ECF3] dark:bg-[#10243E] text-[#061B36] dark:text-[#C9D3EA]"
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Lock / Unlock row (.lock) */}
                  <div className="mt-auto flex justify-between items-center gap-2 border-t border-dashed border-[#E9E5DC] dark:border-[#1E3557] pt-2.5 text-[0.82rem] text-[#5B6479] dark:text-[#93A3BE]">
                    <span className="truncate">
                      🔒 {hasDirectContact ? 'Direct hiring contact available' : 'Application pathway available'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUnlockOpportunity(o)}
                      className="inline-flex items-center justify-center rounded-full py-1.5 px-3.5 text-[0.85rem] font-bold bg-[#D6952F] hover:bg-[#E0A85A] text-[#061B36] transition-colors cursor-pointer shrink-0"
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search All Opportunities CTA */}
        <div className="text-center mt-[26px]">
          <Link
            href="/opportunities"
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 font-bold text-[0.95rem] leading-none bg-[#061B36] hover:bg-[#10243E] text-white hover:shadow-[0_8px_24px_-6px_rgba(6,27,54,0.45)] transition-all cursor-pointer no-underline"
          >
            Search all opportunities →
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
            className="relative w-full max-w-[520px] rounded-[20px] bg-white dark:bg-[#0C1E38] p-6 shadow-2xl border border-[#E9E5DC] dark:border-[#1E3557]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setUnlockOpportunity(null)}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-[#5B6479] hover:text-[#061B36] dark:text-[#93A3BE] dark:hover:text-white p-1 text-xl leading-none transition-colors cursor-pointer"
            >
              ✕
            </button>

            <h3 className="font-sans font-bold text-[1.25rem] text-[#061B36] dark:text-[#F2F5FA] leading-[1.2] pr-6">
              {unlockOpportunity.title}
            </h3>

            <p className="text-[0.9rem] text-[#5B6479] dark:text-[#93A3BE] mt-1.5 mb-3 flex items-center flex-wrap gap-2">
              <span>{unlockOpportunity.location || unlockOpportunity.country || 'Global'}</span>
              <span>·</span>
              <span>{formatExp(unlockOpportunity)}</span>
              <span>·</span>
              <span className="font-mono text-[0.78rem] text-[#5B6479] dark:text-[#93A3BE]">
                {unlockOpportunity.jobId || unlockOpportunity.id}
              </span>
            </p>

            <p className="text-[0.92rem] text-[#1A2236] dark:text-[#DCE5F2] font-medium mb-3">
              The{' '}
              {unlockOpportunity.applicationContact || unlockOpportunity.applicationUrl
                ? 'hiring contact'
                : 'application pathway'}{' '}
              for this role is in:
            </p>

            <div className="space-y-2 mb-4">
              {(unlockOpportunity.vaults && unlockOpportunity.vaults.length > 0
                ? unlockOpportunity.vaults
                : vaults.slice(0, 3)
              ).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-[12px] border border-[#E9E5DC] dark:border-[#1E3557] bg-[#FEFDF9] dark:bg-[#10243E]"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block text-[0.95rem] text-[#061B36] dark:text-[#F2F5FA] truncate">
                      {v.name}
                    </b>
                    <small className="text-[0.78rem] text-[#5B6479] dark:text-[#93A3BE] block truncate">
                      {v.type === 'both' || v.type === 'premier'
                        ? 'India + International'
                        : v.type === 'india'
                          ? 'India'
                          : 'International'}
                      {v.description ? ` · ${v.description}` : ''}
                    </small>
                  </div>
                  <Link
                    href={`/opportunities/${unlockOpportunity.id}`}
                    className="inline-flex items-center justify-center rounded-full py-1.5 px-4 text-[0.82rem] font-bold bg-[#061B36] hover:bg-[#10243E] text-white transition-colors no-underline shrink-0"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-[0.82rem] text-[#5B6479] dark:text-[#93A3BE] leading-relaxed">
              Subscribe to any vault above to reveal the contact and application details for this opportunity.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
