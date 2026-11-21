'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { fetchVaults, fetchPublicPricing } from '@/lib/services';
import { PricingGroup, Vault } from '@/lib/types';
import { Card, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    INDIA: 'INDIA',
    GLOBAL: 'GLOBAL + INDIA',
    MIDDLE_EAST: 'MIDDLE EAST',
    INTERNATIONAL: 'INTERNATIONAL',
    OTHER: 'OTHER',
  };
  return map[type] || type;
}

function getVaultIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('early') || n.includes('career')) {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  }
  if (n.includes('management') || n.includes('mid')) {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    );
  }
  if (n.includes('leadership') || n.includes('senior')) {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    );
  }
  if (n.includes('executive') || n.includes('c-suite')) {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.3 4.9 5.2.8-3.8 3.7.9 5.3-4.6-2.4-4.6 2.4.9-5.3-3.8-3.7 5.2-.8L12 3.5Z" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.8} />
      </svg>
    );
  }
  if (n.includes('remote')) {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
      </svg>
    );
  }
  if (n.includes('uae') || n.includes('global') || n.includes('middle')) {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 014 10 15 15 0 01-4 10 15.3 15.3 0 01-4-10 15 15 0 014-10z" />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

type VaultFilterCategory = 'ALL' | 'INDIA' | 'GLOBAL' | 'EXECUTIVE';

export default function VaultsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [pricing, setPricing] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<VaultFilterCategory>('ALL');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([fetchVaults(), fetchPublicPricing()])
      .then(([v, p]) => {
        setVaults(v || []);
        setPricing(p || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredVaults = useMemo(() => {
    if (activeCategory === 'ALL') return vaults;
    return vaults.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const type = (v.type || '').toUpperCase();
      if (activeCategory === 'INDIA') {
        return type === 'INDIA' || name.includes('india');
      }
      if (activeCategory === 'GLOBAL') {
        return (
          type === 'GLOBAL' ||
          type === 'INTERNATIONAL' ||
          type === 'MIDDLE_EAST' ||
          name.includes('global') ||
          name.includes('international') ||
          name.includes('uae')
        );
      }
      if (activeCategory === 'EXECUTIVE') {
        return (
          name.includes('executive') ||
          name.includes('c-suite') ||
          name.includes('leadership') ||
          name.includes('senior')
        );
      }
      return true;
    });
  }, [vaults, activeCategory]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 dark:bg-[#07172B] dark:text-slate-100">
      {/* SECTION 1 — HIGH-IMPACT EXECUTIVE HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] pb-16 pt-14 text-white isolate sm:pb-20 sm:pt-18">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#D6952F]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]"
        />

        <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-1.5 text-xs text-[#AEB9D6]">
            <Link href="/" className="text-[#F0C27B] hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-white/80">Opportunity Vaults</span>
          </div>

          <div className="text-center sm:text-left">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/40 bg-[#D6952F]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#F0C27B] mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0C27B] animate-pulse" />
              PLANS &amp; PRICING · CURATED ACCESS
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-5xl leading-[1.12]">
              Choose Access That Matches Your{' '}
              <span className="bg-gradient-to-r from-[#F0C27B] via-[#E8D08B] to-[#D6952F] bg-clip-text text-transparent">
                Career Search
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#C9D3EA] sm:text-lg">
              Each Vault is built around a verified geographic market and leadership seniority level.
              Bypass algorithmic job boards to access pre-market opportunities, direct decision-maker
              contacts, and retained executive search mandates.
            </p>

            {/* Trust Badges Strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 text-xs text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Verified Decision-Maker Contacts
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                </svg>
                India, GCC &amp; Global Coverage
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Real-Time Daily Additions
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Secure Checkout · Instant Access
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — SUBSCRIPTION EXPLANATION BANNER */}
      <section className="border-b border-[#E9E5DC] bg-[#FAF8F5] py-5 dark:border-[#1E3557] dark:bg-[#07172B]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#D6952F]/30 bg-gradient-to-r from-[#FFFDF9] to-[#FBF5EB] p-5 shadow-sm dark:border-[#D6952F]/20 dark:from-[#091F38] dark:to-[#07172B]">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-xs dark:bg-[#0A2645]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#061B36] dark:text-white">
                    What your subscription covers:
                  </h4>
                  <p className="mt-0.5 text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                    You are not paying to apply for jobs. Your subscription covers the meticulous market intelligence
                    of identifying, verifying and organizing direct hiring routes conveniently in one place.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-2 lg:pt-0">
                <Link
                  href="/opportunities"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D6952F]/50 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#8A6524] shadow-xs hover:border-[#D6952F] hover:bg-[#FAF6EE] transition dark:bg-[#081B33] dark:text-[#F0C27B] dark:hover:bg-[#0B2342]"
                >
                  <span>Open Free Preview First</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — VAULT CARDS & PRICING */}
      <section className="bg-[#FAF8F5] py-12 dark:bg-[#07172B]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Section Header with Category Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-[#E9E5DC] pb-6 dark:border-[#1E3557]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F] dark:text-[#F0C27B]">
                Curated Executive Portfolios
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
                Available Opportunity Vaults
              </h2>
              <p className="mt-1.5 text-sm text-[#5B6479] dark:text-slate-300">
                Choose a single region or combine global access for full executive coverage.
              </p>
            </div>

            {/* Filter Tabs */}
            {vaults.length > 0 && !loading && (
              <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-white p-1 border border-[#E9E5DC] shadow-xs dark:bg-[#0D2038] dark:border-[#1E3557]">
                <button
                  type="button"
                  onClick={() => setActiveCategory('ALL')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === 'ALL'
                      ? 'bg-[#061B36] text-white shadow-xs dark:bg-[#1E3557]'
                      : 'text-[#5B6479] hover:text-[#061B36] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  All Vaults ({vaults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('INDIA')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === 'INDIA'
                      ? 'bg-[#061B36] text-white shadow-xs dark:bg-[#1E3557]'
                      : 'text-[#5B6479] hover:text-[#061B36] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  India
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('GLOBAL')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === 'GLOBAL'
                      ? 'bg-[#061B36] text-white shadow-xs dark:bg-[#1E3557]'
                      : 'text-[#5B6479] hover:text-[#061B36] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Global &amp; Multi-Country
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('EXECUTIVE')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === 'EXECUTIVE'
                      ? 'bg-[#061B36] text-white shadow-xs dark:bg-[#1E3557]'
                      : 'text-[#5B6479] hover:text-[#061B36] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Executive &amp; Senior
                </button>
              </div>
            )}
          </div>

          {/* Cards Grid */}
          <div className="mt-8">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-96 rounded-3xl" />
                ))}
              </div>
            ) : error ? (
              <Card>
                <ErrorState message={error} onRetry={load} />
              </Card>
            ) : vaults.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<VaultIcon className="h-6 w-6" />}
                  title="No vaults yet"
                  description="Vaults will appear here as they are published."
                />
              </Card>
            ) : filteredVaults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E9E5DC] bg-white p-12 text-center dark:border-[#1E3557] dark:bg-[#0D2038]">
                <p className="text-sm font-semibold text-[#5B6479] dark:text-slate-300">
                  No vaults match this category.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCategory('ALL')}
                  className="mt-3 text-xs font-bold text-[#D6952F] underline underline-offset-4 hover:text-[#B37E28]"
                >
                  View all vaults
                </button>
              </div>
            ) : (
              <div className="grid gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
                {filteredVaults.map((v) => {
                  const vPlans = pricing.find((g) => g.vault.id === v.id)?.plans ?? [];
                  const maxDiscount = vPlans.reduce(
                    (m, p) => Math.max(m, p.discountPercentage ?? 0),
                    0,
                  );
                  const target = v.locked
                    ? `/vaults/${v.id}`
                    : `/opportunities?vaultId=${encodeURIComponent(v.id)}`;
                  const vaultIcon = getVaultIcon(v.name);

                  return (
                    <article
                      key={v.id}
                      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#E9E5DC] bg-white p-6 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D6952F]/60 hover:shadow-xl dark:border-[#1E3557] dark:bg-[#0D2038] dark:hover:border-[#F0C27B]/50"
                    >
                      {/* Top decorative gradient bar */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#D6952F] via-[#F0C27B] to-[#D6952F] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      {/* Subtle circular ambient glow in top-right */}
                      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#FAF0DC]/60 blur-xl dark:bg-[#D6952F]/5" />

                      {/* Card Header */}
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#061B36] text-[#F0C27B] border border-[#D6952F]/40 shadow-sm ring-1 ring-white/10 dark:bg-[#07172B] dark:border-[#D6952F]/30">
                            {vaultIcon}
                          </div>
                          <div className="min-w-0">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#C8943E] dark:text-[#F0C27B]">
                              {typeLabel(v.type)}
                            </span>
                            <h3 className="text-lg font-bold tracking-tight text-[#061B36] dark:text-white truncate group-hover:text-[#D6952F] dark:group-hover:text-[#F0C27B] transition-colors">
                              {v.name}
                            </h3>
                          </div>
                        </div>

                        {/* Status / Discount Badges */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {vPlans.length > 0 && maxDiscount > 0 && (
                            <span className="inline-flex shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/30">
                              Up to {maxDiscount}% OFF
                            </span>
                          )}
                          {v.locked ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              Locked
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              Unlocked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mt-3.5 text-sm leading-relaxed text-[#5B6479] dark:text-slate-300 min-h-[42px]">
                        {v.description || 'Curated opportunities and direct hiring routes for verified leadership professionals.'}
                      </p>

                      {/* Feature Tags */}
                      <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-1 font-medium text-[#5B6479] border border-[#E9E5DC] dark:bg-[#081B33] dark:text-slate-300 dark:border-[#1E3557]">
                          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Direct Contacts
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-1 font-medium text-[#5B6479] border border-[#E9E5DC] dark:bg-[#081B33] dark:text-slate-300 dark:border-[#1E3557]">
                          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Verified Mandates
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-1 font-medium text-[#5B6479] border border-[#E9E5DC] dark:bg-[#081B33] dark:text-slate-300 dark:border-[#1E3557]">
                          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Daily Updates
                        </span>
                      </div>

                      {/* Pricing Options */}
                      {vPlans.length > 0 ? (
                        <div className="mt-6 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#8A95A5] dark:text-slate-400">
                            <span>Subscription Plan</span>
                            <span>Price</span>
                          </div>

                          {vPlans.map((p) => (
                            <Link
                              key={p.id}
                              href={v.locked ? `${target}?plan=${p.id}` : target}
                              className="group/tile relative block rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D6952F] hover:bg-white hover:shadow-md dark:border-[#1E3557] dark:bg-[#081B33] dark:hover:border-[#F0C27B]/60 dark:hover:bg-[#0B2342]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-bold text-[#061B36] dark:text-white truncate">
                                    {p.durationLabel}
                                  </span>
                                  {(p.durationDays === 90 || p.durationDays === 180) && (
                                    <span className="shrink-0 rounded-full bg-gradient-to-r from-[#D6952F] to-[#B37E28] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                      Popular
                                    </span>
                                  )}
                                </span>
                                {(p.discountPercentage ?? 0) > 0 ? (
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/30">
                                    {p.discountPercentage}% OFF
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#8A95A5] dark:text-slate-400">
                                    Standard
                                  </span>
                                )}
                              </div>

                              <div className="mt-2.5 flex items-baseline justify-between gap-3">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
                                    {formatMoney(p.discountedPrice ?? p.price, p.currency)}
                                  </span>
                                  {p.regularPrice && p.regularPrice !== (p.discountedPrice ?? p.price) && (
                                    <span className="text-xs text-[#8A95A5] dark:text-slate-400 line-through">
                                      {formatMoney(p.regularPrice, p.currency)}
                                    </span>
                                  )}
                                </div>
                                {(p.discountPercentage ?? 0) > 0 && p.regularPrice && (
                                  <span className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    Save {formatMoney(p.regularPrice - (p.discountedPrice ?? p.price), p.currency)}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center justify-end">
                                <span className="inline-flex translate-y-0.5 items-center gap-1 text-xs font-bold text-[#D6952F] opacity-0 transition-all duration-200 group-hover/tile:opacity-100 dark:text-[#F0C27B]">
                                  Select Plan <span aria-hidden>→</span>
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-6 rounded-2xl border border-dashed border-[#E9E5DC] p-5 text-center dark:border-[#1E3557]">
                          <p className="text-xs font-semibold text-[#8A95A5] dark:text-slate-400">
                            Custom enterprise plans available upon request.
                          </p>
                        </div>
                      )}

                      {/* Primary CTA button */}
                      <div className="mt-auto pt-6">
                        {v.locked ? (
                          <Link href={`/vaults/${v.id}`} className="block">
                            <button
                              type="button"
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D6952F] via-[#C8943E] to-[#B37E28] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 hover:shadow-md cursor-pointer"
                            >
                              <span>View &amp; subscribe</span>
                              <span aria-hidden="true">→</span>
                            </button>
                          </Link>
                        ) : (
                          <Link href={target} className="block">
                            <button
                              type="button"
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#061B36] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0A2645] hover:shadow-md dark:bg-[#1E3557] dark:hover:bg-[#25426B] cursor-pointer"
                            >
                              <span>View opportunities</span>
                              <span aria-hidden="true">→</span>
                            </button>
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY GRAVITAS EDGE VAULTS */}
      <section className="border-t border-[#E9E5DC] bg-white py-14 dark:border-[#1E3557] dark:bg-[#081B33]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F] dark:text-[#F0C27B]">
              The Gravitas Advantage
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
              Why Executives Choose Gravitas Edge
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base text-[#5B6479] dark:text-slate-300">
              Traditional job portals rely on keyword algorithms and crowded applicant pools.
              Gravitas Edge provides verified intelligence and direct hiring manager routing.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-6 dark:border-[#1E3557] dark:bg-[#0D2038]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-xs">
                <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#061B36] dark:text-white">
                Direct Hiring Contacts
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                Each opportunity includes validated decision-maker contact details — name, title, and verified email route — so your inquiry reaches the actual hiring authority.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-6 dark:border-[#1E3557] dark:bg-[#0D2038]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-xs">
                <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#061B36] dark:text-white">
                Pre-Market &amp; Retained Searches
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                Discover roles sourced directly from executive search partners and confidential institutional mandates before they are publicly broadcast.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-6 dark:border-[#1E3557] dark:bg-[#0D2038]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-xs">
                <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#061B36] dark:text-white">
                Cross-Border Global Mobility
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                Target leadership and executive mandates across high-growth international corridors including India, UAE, Singapore, the UK, and Europe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS 5 & 6 — RESUME UPLOAD + REFERRAL REWARDS */}
      <section className="border-t border-[#E9E5DC] bg-[#FAF8F5] py-14 sm:py-18 dark:border-[#1E3557] dark:bg-[#07172B]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 items-stretch">
            {/* Resume Upload Card */}
            <div>
              <ResumeUploadCard />
            </div>

            {/* Referral Rewards Card */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E9E5DC] bg-white p-7 sm:p-8 shadow-sm dark:border-[#1E3557] dark:bg-[#0D2038]">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#FAF0DC]/50 dark:bg-[#D6952F]/10 blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#061B36] text-[#F0C27B] border border-[#D6952F]/40 shadow-xs dark:bg-[#07172B]">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#C8943E] dark:text-[#F0C27B]">
                      Networking Benefit
                    </span>
                    <h3 className="text-xl font-bold text-[#061B36] dark:text-white">
                      Subscriber Referral Rewards
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                  Active subscribers can invite peer executives and senior leaders to join Gravitas Edge.
                  Earn recurring rewards on every referral that can be redeemed against future renewals or withdrawn directly.
                </p>

                <div className="mt-6 space-y-3 text-xs sm:text-sm text-[#061B36] dark:text-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
                      ✓
                    </span>
                    <span>Earn generous credits for every confirmed referral</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
                      ✓
                    </span>
                    <span>Redeem against future subscription cycles automatically</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
                      ✓
                    </span>
                    <span>Track all referral rewards directly in your subscriber dashboard</span>
                  </div>
                </div>
              </div>

              <div className="relative mt-8 pt-5 border-t border-[#E9E5DC] dark:border-[#1E3557]">
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D6952F] hover:text-[#B37E28] dark:text-[#F0C27B] dark:hover:text-white transition-colors"
                >
                  <span>Review full referral terms &amp; conditions</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CALLOUT / FAQ ASSISTANCE */}
      <section className="border-t border-[#E9E5DC] bg-white py-12 dark:border-[#1E3557] dark:bg-[#061B36]">
        <div className="mx-auto max-w-[1240px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-[#061B36] dark:text-white">
            Still deciding which Opportunity Vault fits your search?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#5B6479] dark:text-slate-300">
            Browse our comprehensive FAQ knowledge base regarding vault coverage, hiring contact verification, and subscription terms.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-xl bg-[#061B36] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0A2645] transition dark:bg-[#1E3557] dark:hover:bg-[#25426B]"
            >
              <svg className="h-4 w-4 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <span>Visit FAQ Knowledge Base</span>
            </Link>
            <Link
              href="/opportunities"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D6952F]/40 bg-[#D6952F]/10 px-5 py-2.5 text-sm font-semibold text-[#8A6524] hover:bg-[#D6952F]/20 transition dark:text-[#F0C27B]"
            >
              <span>Explore Free Preview</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
