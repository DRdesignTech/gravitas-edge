'use client';

import { useEffect, useState } from 'react';
import { Vault } from '@/lib/types';
import Eyebrow from '@/components/marketing/Eyebrow';
import {
  HiAcademicCap,
  HiChartBar,
  HiUserGroup,
  HiBriefcase,
  HiGlobeAmericas,
  HiBuildingOffice2,
  HiComputerDesktop,
  HiSparkles,
  HiCheck,
  HiArrowPath,
  HiInformationCircle,
  HiFunnel,
  HiMapPin,
} from 'react-icons/hi2';

export type ExperienceOption = 'early' | 'mid' | 'senior' | 'executive';
export type LocationOption = 'india' | 'uae' | 'global' | 'remote';

interface ExperienceDef {
  key: ExperienceOption;
  label: string;
  stage: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EXPERIENCE_OPTIONS: ExperienceDef[] = [
  {
    key: 'early',
    label: '0–5 years',
    stage: 'Early Career',
    desc: 'Entry to Associate & Specialist roles',
    icon: HiAcademicCap,
  },
  {
    key: 'mid',
    label: '5–10 years',
    stage: 'Management',
    desc: 'Mid-Level Managers & Functional Leads',
    icon: HiChartBar,
  },
  {
    key: 'senior',
    label: '10+ years',
    stage: 'Leadership',
    desc: 'Directors, Dept Heads & Senior Leads',
    icon: HiUserGroup,
  },
  {
    key: 'executive',
    label: 'Executive (C-Suite)',
    stage: 'C-Suite & Board',
    desc: 'VP, CXO, Managing Director & Board roles',
    icon: HiBriefcase,
  },
];

interface LocationDef {
  key: LocationOption;
  label: string;
  region: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LOCATION_OPTIONS: LocationDef[] = [
  {
    key: 'india',
    label: 'India',
    region: 'Domestic Leadership Hubs',
    icon: HiBuildingOffice2,
  },
  {
    key: 'uae',
    label: 'UAE & GCC',
    region: 'Middle East Executive Corridors',
    icon: HiMapPin,
  },
  {
    key: 'global',
    label: 'Global Hubs',
    region: 'UK, US, Europe & Singapore',
    icon: HiGlobeAmericas,
  },
  {
    key: 'remote',
    label: 'Cross-Border Remote',
    region: 'Distributed & Borderless Roles',
    icon: HiComputerDesktop,
  },
];

interface VaultFit {
  experience: ExperienceOption | 'any';
  locations: LocationOption[];
}

const VAULT_FIT: Record<string, VaultFit> = {
  'Early Career Access Vault': { experience: 'early', locations: ['india'] },
  'Management Access Vault': { experience: 'mid', locations: ['india'] },
  'Leadership Access Vault': { experience: 'senior', locations: ['india'] },
  'Executive Access Vault': { experience: 'executive', locations: ['india'] },
  'Remote Access Vault': { experience: 'any', locations: ['remote'] },
  'UAE & Global Access Vault': { experience: 'any', locations: ['uae', 'global'] },
};

function getVaultFit(vault: Vault): VaultFit {
  const exact = VAULT_FIT[vault.name.trim()];
  if (exact) return exact;
  const lower = vault.name.toLowerCase();
  if (lower.includes('early') || lower.includes('career')) return { experience: 'early', locations: ['india'] };
  if (lower.includes('management') || lower.includes('mid')) return { experience: 'mid', locations: ['india'] };
  if (lower.includes('leadership') || lower.includes('senior')) return { experience: 'senior', locations: ['india'] };
  if (lower.includes('executive') || lower.includes('c-suite')) return { experience: 'executive', locations: ['india'] };
  if (lower.includes('remote')) return { experience: 'any', locations: ['remote'] };
  if (lower.includes('uae') || lower.includes('global') || lower.includes('middle east')) return { experience: 'any', locations: ['uae', 'global'] };

  switch (vault.type) {
    case 'INDIA':
      return { experience: 'any', locations: ['india'] };
    case 'MIDDLE_EAST':
      return { experience: 'any', locations: ['uae', 'global'] };
    case 'INTERNATIONAL':
      return { experience: 'any', locations: ['remote', 'global'] };
    default:
      return { experience: 'any', locations: ['global'] };
  }
}

export function findRecommendedVaults(
  vaults: Vault[],
  options: {
    experience: ExperienceOption | null;
    locations: LocationOption[];
  },
): Set<string> {
  const { experience, locations } = options;
  if (!experience || locations.length === 0) return new Set();
  const recommended = vaults
    .filter((vault) => {
      const fit = getVaultFit(vault);
      const experienceMatch = fit.experience === 'any' || fit.experience === experience;
      const locationMatch = fit.locations.some((loc) => locations.includes(loc));
      return experienceMatch && locationMatch;
    })
    .map((vault) => vault.id);
  return new Set(recommended);
}

export default function VaultFinder({
  vaults,
  recommended,
  onRecommendedChange,
  onlyRecommended = false,
  onToggleOnlyRecommended,
}: {
  vaults: Vault[];
  recommended: Set<string>;
  onRecommendedChange: (ids: Set<string>) => void;
  onlyRecommended?: boolean;
  onToggleOnlyRecommended?: (val: boolean) => void;
}) {
  const [experience, setExperience] = useState<ExperienceOption | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  useEffect(() => {
    onRecommendedChange(findRecommendedVaults(vaults, { experience, locations }));
  }, [vaults, experience, locations, onRecommendedChange]);

  const toggleLocation = (loc: LocationOption) => {
    setLocations((prev) => (prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]));
  };

  const reset = () => {
    setExperience(null);
    setLocations([]);
    onRecommendedChange(new Set());
    if (onToggleOnlyRecommended) onToggleOnlyRecommended(false);
  };

  const hasSelection = experience !== null || locations.length > 0;
  const answered = experience !== null && locations.length > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface via-surface to-surface-muted p-6 shadow-card transition-all duration-300 dark:from-surface-elevated dark:via-surface-elevated dark:to-surface sm:p-8">
      {/* Subtle luxury glow in top right */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(200,148,62,0.18), transparent 70%)' }}
      />

      <div className="relative">
        {/* Top Header & Reset Action */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 pb-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#061B36] text-[#E3B968] shadow-sm dark:bg-[#D6952F] dark:text-[#061B36]">
                <HiFunnel className="h-4 w-4" />
              </span>
              <Eyebrow>VAULT NAVIGATOR</Eyebrow>
            </div>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Tailor opportunities to your seniority &amp; target markets
            </h3>
            <p className="mt-1 text-sm text-content-muted">
              Select your career stage and preferred geographies to instantly spotlight matching vaults.
            </p>
          </div>

          {hasSelection && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6952F]/40 bg-surface px-3.5 py-2 text-xs font-semibold text-content-muted transition hover:border-[#D6952F] hover:bg-surface-muted hover:text-content active:scale-[0.98] dark:bg-surface-elevated"
            >
              <HiArrowPath className="h-3.5 w-3.5 text-[#D6952F]" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Dual Selectors: Seniority & Location */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Question 1: Experience Level */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-content-faint">
                1. Select Experience Level
              </p>
              {experience && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Selected
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = experience === opt.key;

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setExperience(opt.key)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#D6952F] bg-[#061B36] text-white shadow-md ring-1 ring-[#D6952F] dark:bg-[#061B36] dark:text-white'
                        : 'border-line bg-surface hover:border-[#D6952F]/60 hover:bg-surface-muted text-content dark:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? 'bg-white/10 text-[#E3B968]'
                              : 'bg-surface-muted text-content-muted group-hover:text-[#D6952F] dark:bg-white/5'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-bold text-sm leading-tight">{opt.label}</p>
                          <p
                            className={`text-[11px] font-semibold ${
                              isSelected ? 'text-[#E3B968]' : 'text-content-faint'
                            }`}
                          >
                            {opt.stage}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D6952F] text-[#061B36]">
                          <HiCheck className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-[11px] leading-snug line-clamp-1 ${
                        isSelected ? 'text-[#9FB0CC]' : 'text-content-muted'
                      }`}
                    >
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 2: Target Markets / Location */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-content-faint">
                2. Select Preferred Markets
              </p>
              <span className="text-[11px] font-medium text-content-muted">
                {locations.length > 0 ? `${locations.length} selected` : 'Multi-select'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {LOCATION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = locations.includes(opt.key);

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleLocation(opt.key)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#D6952F] bg-[#061B36] text-white shadow-md ring-1 ring-[#D6952F] dark:bg-[#061B36] dark:text-white'
                        : 'border-line bg-surface hover:border-[#D6952F]/60 hover:bg-surface-muted text-content dark:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? 'bg-white/10 text-[#E3B968]'
                              : 'bg-surface-muted text-content-muted group-hover:text-[#D6952F] dark:bg-white/5'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-bold text-sm leading-tight">{opt.label}</p>
                          <p
                            className={`text-[11px] font-semibold ${
                              isSelected ? 'text-[#E3B968]' : 'text-content-faint'
                            }`}
                          >
                            {opt.region}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                          isSelected
                            ? 'bg-[#D6952F] text-[#061B36]'
                            : 'border border-line bg-surface-muted dark:bg-white/5'
                        }`}
                      >
                        {isSelected && <HiCheck className="h-3 w-3" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Recommendation Feedback Bar */}
        <div className="mt-6 pt-5 border-t border-line/60">
          {answered ? (
            <div
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                recommended.size > 0
                  ? 'border-[#D6952F]/40 bg-[#FFF3D9]/40 text-content dark:bg-[#C8943E]/10'
                  : 'border-line bg-surface-muted text-content-muted'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D6952F] text-[#061B36]">
                  <HiSparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold text-sm text-[#061B36] dark:text-white">
                    {recommended.size > 0
                      ? `Found ${recommended.size} matching career vault${recommended.size > 1 ? 's' : ''}`
                      : 'No exact vault matches found'}
                  </p>
                  <p className="text-xs text-content-muted">
                    {recommended.size > 0
                      ? 'The vaults highlighted with "Recommended For You" match your selected criteria.'
                      : 'Showing all vaults. Try expanding your location or experience selection.'}
                  </p>
                </div>
              </div>

              {recommended.size > 0 && onToggleOnlyRecommended && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleOnlyRecommended(!onlyRecommended)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                      onlyRecommended
                        ? 'bg-[#061B36] text-white hover:bg-[#0A2645] dark:bg-[#D6952F] dark:text-[#061B36]'
                        : 'border border-[#D6952F] bg-white text-[#061B36] hover:bg-[#FFF3D9] dark:bg-white/10 dark:text-white'
                    }`}
                  >
                    {onlyRecommended
                      ? `Show All (${vaults.length})`
                      : `Show Only Matches (${recommended.size})`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-content-muted">
              <HiInformationCircle className="h-4 w-4 shrink-0 text-[#D6952F]" />
              <span>
                Pick your seniority level and one or more target regions above to filter the vaults below.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
