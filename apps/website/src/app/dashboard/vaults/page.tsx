'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import {
  HiAdjustmentsHorizontal,
  HiArrowRight,
  HiBriefcase,
  HiBuildingOffice2,
  HiCheck,
  HiCheckCircle,
  HiFunnel,
  HiGlobeAlt,
  HiLockClosed,
  HiLockOpen,
  HiMagnifyingGlass,
  HiShieldCheck,
  HiSparkles,
  HiXMark,
} from 'react-icons/hi2';
import { fetchVaults } from '@/lib/services';
import { Vault } from '@/lib/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui';
import { VaultCard } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';

export default function VaultsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'name-asc' | 'name-desc'>('recommended');

  const load = () => {
    setLoading(true);
    setError('');
    fetchVaults()
      .then(setVaults)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Compute counts
  const unlockedCount = vaults.filter((v) => !v.locked).length;
  const lockedCount = vaults.filter((v) => v.locked).length;

  // Extract distinct vault types
  const vaultTypes = useMemo(() => {
    const types = new Set<string>();
    vaults.forEach((v) => {
      if (v.type) types.add(v.type);
    });
    return Array.from(types);
  }, [vaults]);

  // Filter and sort vaults
  const filteredVaults = useMemo(() => {
    let result = [...vaults];

    // Access filter
    if (accessFilter === 'unlocked') {
      result = result.filter((v) => !v.locked);
    } else if (accessFilter === 'locked') {
      result = result.filter((v) => v.locked);
    }

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter((v) => v.type === selectedType);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((v) => {
        const nameMatch = v.name.toLowerCase().includes(q);
        const descMatch = (v.description || '').toLowerCase().includes(q);
        const typeMatch = (v.type || '').toLowerCase().includes(q);
        const expMatch = (v.experienceLevels || []).some((el) =>
          el.name.toLowerCase().includes(q),
        );
        return nameMatch || descMatch || typeMatch || expMatch;
      });
    }

    // Sort order
    if (sortBy === 'recommended') {
      result.sort((a, b) => {
        // Unlocked vaults first, then sortOrder
        if (a.locked !== b.locked) return a.locked ? 1 : -1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [vaults, accessFilter, selectedType, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || accessFilter !== 'all' || selectedType !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setAccessFilter('all');
    setSelectedType('all');
    setSortBy('recommended');
  };

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E5DC] pb-6 dark:border-[#1E3557]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#D6952F] dark:text-[#F0C27B]">
              Executive Requisition Sectors
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-[#8C9AC0]">
              {loading ? 'Loading...' : `${unlockedCount} of ${vaults.length} Unlocked`}
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#061B36] dark:text-white">
            Opportunity Vaults Directory
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 max-w-2xl">
            Explore regional and functional candidate vaults holding unadvertised pre-market executive
            mandates with unmasked direct recruiter contacts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/plans">
            <Button
              size="sm"
              className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs inline-flex items-center gap-1.5"
            >
              <span>Unlock More Vaults</span>
              <HiArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="text-xs font-semibold">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          METRICS SUMMARY ROW
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
            Total Vaults
          </span>
          <p className="mt-1 text-2xl font-bold text-[#061B36] dark:text-white">
            {vaults.length}
          </p>
          <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
            Regional &amp; functional sectors
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
            Unlocked &amp; Active
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {unlockedCount}
            </p>
            {unlockedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/70 dark:text-emerald-300">
                <HiCheck className="h-3 w-3" />
                Live
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
            Full contact unmasking active
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
            Locked / Preview Vaults
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold text-[#D6952F] dark:text-[#F0C27B]">
              {lockedCount}
            </p>
            {lockedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D6952F] bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-950/70 dark:text-[#F0C27B]">
                <HiLockClosed className="h-3 w-3" />
                Preview
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
            Subscribe to unlock contacts
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
            Mandate Exclusivity
          </span>
          <div className="mt-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <HiShieldCheck className="h-5 w-5" />
            <span className="text-sm font-bold">100% Retained</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
            Pre-market executive requisitions
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SEARCH & FILTER TOOLBAR
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 sm:p-5 shadow-sm space-y-4 dark:border-[#1E3557] dark:bg-[#0E2340]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <HiMagnifyingGlass className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vaults by name, region, function, or experience..."
              className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#8C9AC0] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
              >
                <HiXMark className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#8C9AC0] hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
            >
              <option value="recommended">Recommended (Unlocked First)</option>
              <option value="name-asc">Name (A – Z)</option>
              <option value="name-desc">Name (Z – A)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills / Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F0EBE1] dark:border-[#1E3557]">
          {/* Access Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#8C9AC0] mr-1">Access:</span>
            <button
              type="button"
              onClick={() => setAccessFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                accessFilter === 'all'
                  ? 'bg-[#061B36] text-white dark:bg-[#D6952F] dark:text-[#061B36]'
                  : 'bg-[#FAF8F5] text-[#5B6479] hover:bg-slate-100 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300'
              }`}
            >
              All Vaults ({vaults.length})
            </button>

            <button
              type="button"
              onClick={() => setAccessFilter('unlocked')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                accessFilter === 'unlocked'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FAF8F5] text-[#5B6479] hover:bg-slate-100 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300'
              }`}
            >
              <HiLockOpen className="h-3 w-3" />
              <span>Unlocked Only ({unlockedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setAccessFilter('locked')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                accessFilter === 'locked'
                  ? 'bg-[#D6952F] text-[#061B36] font-bold'
                  : 'bg-[#FAF8F5] text-[#5B6479] hover:bg-slate-100 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300'
              }`}
            >
              <HiLockClosed className="h-3 w-3" />
              <span>Locked / Previews ({lockedCount})</span>
            </button>
          </div>

          {/* Sector / Type Filter Pills (if multiple exist) */}
          {vaultTypes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#8C9AC0]">Type:</span>
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-[#061B36] text-white dark:bg-[#D6952F] dark:text-[#061B36]'
                    : 'bg-[#FAF8F5] text-[#5B6479] hover:bg-slate-100 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300'
                }`}
              >
                All
              </button>
              {vaultTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition cursor-pointer capitalize ${
                    selectedType === type
                      ? 'bg-[#061B36] text-white dark:bg-[#D6952F] dark:text-[#061B36]'
                      : 'bg-[#FAF8F5] text-[#5B6479] hover:bg-slate-100 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Reset Filters Shortcut */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#D6952F] hover:text-[#B87A22] underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VAULTS DIRECTORY GRID
          ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : filteredVaults.length === 0 ? (
        <Card className="py-8">
          <EmptyState
            title="No matching vaults found"
            description={
              hasActiveFilters
                ? 'Try adjusting your search keywords, access status, or sector filters.'
                : 'Vaults will appear here when published.'
            }
            action={
              hasActiveFilters ? (
                <Button size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredVaults.map((v) => (
            <VaultCard key={v.id} vault={v} />
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          WHY OPPORTUNITY VAULTS EXPLAINER
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#070C1B] to-[#122244] p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F0C27B] bg-white/10 px-3 py-1 rounded-full">
              <HiSparkles className="h-3.5 w-3.5" />
              <span>Pre-Market Mandate Architecture</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              Why Subscribe to an Opportunity Vault?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Executive appointments are rarely listed on public portals. Gravitas Edge Opportunity Vaults
              curate verified requisitions 10–14 days prior to public disclosure, providing you direct,
              unmasked contact access to the corporate search committee.
            </p>
          </div>

          <div className="shrink-0">
            <Link href="/plans">
              <Button
                size="sm"
                className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs py-2.5 px-5"
              >
                Explore Subscription Plans →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
