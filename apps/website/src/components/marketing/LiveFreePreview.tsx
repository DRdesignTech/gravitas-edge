'use client';

import { useState, useMemo } from 'react';
import { Opportunity } from '@/lib/types';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { OpportunityCard, SearchIcon } from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import HomeAnchor from '@/components/marketing/HomeAnchor';

const INITIAL_COUNT = 6;

export default function LiveFreePreview({
  opportunities,
  loading,
  error,
  onRetry,
}: {
  opportunities: Opportunity[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const canCollapse = opportunities.length > INITIAL_COUNT;
  const visible = expanded
    ? opportunities.length
    : Math.min(INITIAL_COUNT, opportunities.length);

  const filteredOpportunities = useMemo(() => {
    if (!searchQuery.trim()) return opportunities;
    const query = searchQuery.toLowerCase();
    return opportunities.filter((o) =>
      o.title?.toLowerCase().includes(query) ||
      o.company?.toLowerCase().includes(query) ||
      o.location?.toLowerCase().includes(query) ||
      o.experienceLevels?.some((e) => e.name.toLowerCase().includes(query)) ||
      o.source?.toLowerCase().includes(query)
    );
  }, [opportunities, searchQuery]);

  return (
    <section id="free-preview" className="scroll-mt-20 border-t border-line bg-surface dark:bg-surface-elevated/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <Eyebrow>LIVE FREE PREVIEW</Eyebrow>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
            See what is available before you subscribe.
          </h2>
          <p className="mt-2 text-sm text-content-muted sm:text-base">
            Browse current opportunities below — the same roles being curated across the Gravitas
            Edge Opportunity Vaults — before deciding whether paid access makes sense for your
            search.
          </p>
        </div>

        {!loading && !error && opportunities.length > 0 && (
          <div className="mb-6">
            <label htmlFor="free-preview-search" className="sr-only">
              Search opportunities
            </label>
            <div className="relative max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto sm:mx-0">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-content-muted/50" aria-hidden="true" />
              <input
                id="free-preview-search"
                type="search"
                placeholder="Search by role, company, location, experience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full rounded-xl border border-line bg-surface px-5 py-4 pl-14 text-base text-content placeholder:text-content-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                aria-label="Search opportunities by title, company, or location"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted hover:text-content transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : filteredOpportunities.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
            <EmptyState
              icon={<SearchIcon className="h-6 w-6" />}
              title={searchQuery ? 'No matching opportunities' : 'No opportunities yet'}
              description={searchQuery
                ? 'Try adjusting your search or clear the filter.'
                : 'Check back soon — new opportunities are added regularly.'}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOpportunities.slice(0, visible).map((o) => (
                <OpportunityCard key={o.id} opportunity={o} />
              ))}
            </div>

            {filteredOpportunities.length > INITIAL_COUNT && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-content shadow-sm transition-colors hover:border-brand-300 hover:bg-surface-muted dark:bg-surface-elevated"
                  aria-expanded={expanded}
                >
                  {expanded ? 'Show Fewer Opportunities' : 'Show More Opportunities'}
                  <svg
                    className={`h-4 w-4 text-brand-500 transition-transform duration-200 ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            )}

            <div className="mt-8 flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface-muted px-5 py-4 text-sm text-content-muted dark:bg-surface/60 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Full company, source, contact and application details for premium opportunities
                unlock with the relevant Opportunity Vault access.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
                <HomeAnchor
                  href="#vaults"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Explore Opportunity Vaults →
                </HomeAnchor>
                <HomeAnchor
                  href="#plans"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  View Plans →
                </HomeAnchor>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}