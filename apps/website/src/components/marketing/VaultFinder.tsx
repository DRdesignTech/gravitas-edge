'use client';

import { useEffect, useMemo, useState } from 'react';
import { Country } from 'country-state-city';
import { Vault } from '@/lib/types';
import Eyebrow from '@/components/marketing/Eyebrow';
import {
  HiAcademicCap,
  HiChartBar,
  HiUserGroup,
  HiBriefcase,
  HiGlobeAmericas,
  HiComputerDesktop,
  HiSparkles,
  HiCheck,
  HiArrowPath,
  HiInformationCircle,
  HiFunnel,
  HiMapPin,
} from 'react-icons/hi2';

export type ExperienceOption = 'early' | 'mid' | 'senior' | 'executive';
export type ContinentOption =
  | 'north_america'
  | 'europe'
  | 'middle_east'
  | 'asia_pacific'
  | 'africa'
  | 'south_america'
  | 'remote';

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

interface ContinentDef {
  key: ContinentOption;
  label: string;
  subtitle: string;
}

const CONTINENT_OPTIONS: ContinentDef[] = [
  { key: 'north_america', label: 'North America', subtitle: 'US, Canada & Mexico' },
  { key: 'europe', label: 'Europe', subtitle: 'UK, Germany, France, EU' },
  { key: 'middle_east', label: 'Middle East & GCC', subtitle: 'UAE, Saudi Arabia, Qatar' },
  { key: 'asia_pacific', label: 'Asia-Pacific', subtitle: 'Singapore, India, Japan, AU' },
  { key: 'africa', label: 'Africa', subtitle: 'Kenya, Nigeria, South Africa' },
  { key: 'south_america', label: 'South America', subtitle: 'Brazil, Chile, Colombia' },
  { key: 'remote', label: 'Cross-Border Remote', subtitle: 'Distributed Worldwide' },
];

const MIDDLE_EAST_CODES = new Set([
  'AE',
  'SA',
  'QA',
  'OM',
  'BH',
  'KW',
  'JO',
  'LB',
  'IQ',
  'IR',
  'SY',
  'YE',
  'PS',
  'IL',
  'EG',
]);

const SOUTH_AMERICA_CODES = new Set([
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'EC',
  'FK',
  'GF',
  'GY',
  'PE',
  'PY',
  'SR',
  'UY',
  'VE',
]);

function inferContinent(isoCode: string, zoneName?: string): ContinentOption {
  if (MIDDLE_EAST_CODES.has(isoCode)) return 'middle_east';
  if (SOUTH_AMERICA_CODES.has(isoCode)) return 'south_america';
  const z = zoneName || '';
  if (z.startsWith('Europe/') || isoCode === 'IS') return 'europe';
  if (z.startsWith('Africa/')) return 'africa';
  if (z.startsWith('America/')) return 'north_america';
  if (z.startsWith('Asia/') || z.startsWith('Australia/') || z.startsWith('Pacific/')) {
    return 'asia_pacific';
  }
  return 'europe';
}

interface CountryEntry {
  isoCode: string;
  name: string;
  flag: string;
  continent: ContinentOption;
}

const ALL_COUNTRIES: CountryEntry[] = Country.getAllCountries()
  .map((c) => ({
    isoCode: c.isoCode,
    name: c.name,
    flag: c.flag || '🌐',
    continent: inferContinent(c.isoCode, c.timezones?.[0]?.zoneName),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const QUICK_HUBS: { isoCode: string; label: string; flag: string; continent: ContinentOption }[] = [
  { isoCode: 'GB', label: 'United Kingdom', flag: '🇬🇧', continent: 'europe' },
  { isoCode: 'AE', label: 'UAE', flag: '🇦🇪', continent: 'middle_east' },
  { isoCode: 'US', label: 'United States', flag: '🇺🇸', continent: 'north_america' },
  { isoCode: 'SG', label: 'Singapore', flag: '🇸🇬', continent: 'asia_pacific' },
  { isoCode: 'DE', label: 'Germany', flag: '🇩🇪', continent: 'europe' },
  { isoCode: 'CA', label: 'Canada', flag: '🇨🇦', continent: 'north_america' },
  { isoCode: 'AU', label: 'Australia', flag: '🇦🇺', continent: 'asia_pacific' },
  { isoCode: 'IN', label: 'India', flag: '🇮🇳', continent: 'asia_pacific' },
];

interface VaultFit {
  experience: ExperienceOption | 'any';
  continents: ContinentOption[];
  countries?: string[]; // empty/undefined = all countries in matched continents
}

const ALL_INTL_CONTINENTS: ContinentOption[] = [
  'north_america',
  'europe',
  'middle_east',
  'asia_pacific',
  'africa',
  'south_america',
  'remote',
];

function getVaultFit(vault: Vault): VaultFit {
  const lower = vault.name.toLowerCase();

  let exp: ExperienceOption | 'any' = 'any';
  if (lower.includes('early') || lower.includes('career')) exp = 'early';
  else if (lower.includes('management') || lower.includes('mid')) exp = 'mid';
  else if (lower.includes('leadership') || lower.includes('senior')) exp = 'senior';
  else if (lower.includes('executive') || lower.includes('c-suite')) exp = 'executive';

  if (lower.includes('remote')) {
    return { experience: exp, continents: ALL_INTL_CONTINENTS };
  }
  if (lower.includes('uae') || lower.includes('middle east') || lower.includes('gcc')) {
    return {
      experience: exp,
      continents: lower.includes('global') ? ALL_INTL_CONTINENTS : ['middle_east'],
    };
  }
  if (lower.includes('global') || lower.includes('international')) {
    return { experience: exp, continents: ALL_INTL_CONTINENTS };
  }

  switch (vault.type?.toUpperCase()) {
    case 'INDIA':
      return { experience: exp, continents: ['asia_pacific'], countries: ['IN'] };
    case 'MIDDLE_EAST':
      return {
        experience: exp,
        continents: ['middle_east'],
        countries: Array.from(MIDDLE_EAST_CODES),
      };
    case 'INTERNATIONAL':
    case 'GLOBAL':
      return { experience: exp, continents: ALL_INTL_CONTINENTS };
    default:
      return { experience: exp, continents: ALL_INTL_CONTINENTS };
  }
}

export function findRecommendedVaults(
  vaults: Vault[],
  options: {
    experience: ExperienceOption | null;
    continent: ContinentOption | null;
    countryCode: string;
  },
): Set<string> {
  const { experience, continent, countryCode } = options;
  if (!experience && !continent && !countryCode) return new Set();

  const selectedCountry = countryCode
    ? ALL_COUNTRIES.find((c) => c.isoCode === countryCode)
    : undefined;
  const effectiveContinent = continent || selectedCountry?.continent || null;

  const recommended = vaults
    .filter((vault) => {
      const fit = getVaultFit(vault);
      const expMatch = !experience || fit.experience === 'any' || fit.experience === experience;
      const continentMatch =
        !effectiveContinent || fit.continents.includes(effectiveContinent);
      const countryMatch =
        !countryCode || !fit.countries || fit.countries.includes(countryCode);
      return expMatch && continentMatch && countryMatch;
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
  const [continent, setContinent] = useState<ContinentOption | null>(null);
  const [countryCode, setCountryCode] = useState<string>('');

  const filteredCountries = useMemo(() => {
    if (!continent || continent === 'remote') return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter((c) => c.continent === continent);
  }, [continent]);

  useEffect(() => {
    onRecommendedChange(
      findRecommendedVaults(vaults, { experience, continent, countryCode }),
    );
  }, [vaults, experience, continent, countryCode, onRecommendedChange]);

  const handleSelectContinent = (next: ContinentOption) => {
    const toggled = continent === next ? null : next;
    setContinent(toggled);
    if (toggled && toggled !== 'remote' && countryCode) {
      const match = ALL_COUNTRIES.find((c) => c.isoCode === countryCode);
      if (match && match.continent !== toggled) {
        setCountryCode('');
      }
    }
  };

  const handleSelectCountry = (iso: string) => {
    setCountryCode(iso);
    if (iso) {
      const match = ALL_COUNTRIES.find((c) => c.isoCode === iso);
      if (match) {
        setContinent(match.continent);
      }
    }
  };

  const reset = () => {
    setExperience(null);
    setContinent(null);
    setCountryCode('');
    onRecommendedChange(new Set());
    if (onToggleOnlyRecommended) onToggleOnlyRecommended(false);
  };

  const hasSelection = experience !== null || continent !== null || countryCode !== '';
  const selectedCountryObj = countryCode
    ? ALL_COUNTRIES.find((c) => c.isoCode === countryCode)
    : undefined;

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
              <Eyebrow>GLOBAL VAULT NAVIGATOR</Eyebrow>
            </div>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Explore executive vaults by seniority, continent &amp; country
            </h3>
            <p className="mt-1 text-sm text-content-muted">
              Filter international opportunities across every continent and 250+ countries to spot matching vaults.
            </p>
          </div>

          {hasSelection && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6952F]/40 bg-surface px-3.5 py-2 text-xs font-semibold text-content-muted transition hover:border-[#D6952F] hover:bg-surface-muted hover:text-content active:scale-[0.98] dark:bg-surface-elevated cursor-pointer"
            >
              <HiArrowPath className="h-3.5 w-3.5 text-[#D6952F]" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Dual Selectors: Seniority + Continent & Country */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Question 1: Experience Level */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-content-faint">
                1. Experience Level
              </p>
              {experience && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Selected
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = experience === opt.key;

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setExperience(isSelected ? null : opt.key)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
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

          {/* Question 2: Continent & Country Filter */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-content-faint">
                2. Continent &amp; Country Filter
              </p>
              <span className="text-[11px] font-medium text-content-muted">
                {selectedCountryObj
                  ? `${selectedCountryObj.flag} ${selectedCountryObj.name}`
                  : continent
                    ? CONTINENT_OPTIONS.find((c) => c.key === continent)?.label
                    : 'Worldwide'}
              </span>
            </div>

            {/* Continent Pills */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setContinent(null);
                  setCountryCode('');
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  continent === null && !countryCode
                    ? 'border-[#D6952F] bg-[#061B36] text-[#F0C27B] shadow-sm'
                    : 'border-line bg-surface text-content-muted hover:border-[#D6952F]/60 hover:text-content dark:bg-surface-elevated'
                }`}
              >
                <HiGlobeAmericas className="h-3.5 w-3.5" />
                All Continents
              </button>

              {CONTINENT_OPTIONS.map((opt) => {
                const isSelected = continent === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectContinent(opt.key)}
                    title={opt.subtitle}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-[#D6952F] bg-[#061B36] text-[#F0C27B] shadow-sm'
                        : 'border-line bg-surface text-content-muted hover:border-[#D6952F]/60 hover:text-content dark:bg-surface-elevated'
                    }`}
                  >
                    {opt.key === 'remote' ? (
                      <HiComputerDesktop className="h-3.5 w-3.5" />
                    ) : (
                      <HiMapPin className="h-3.5 w-3.5" />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Country Dropdown + Quick Global Hubs */}
            <div className="mt-3.5 rounded-2xl border border-line bg-surface p-3.5 dark:bg-surface-elevated">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <label
                  htmlFor="vault-country-select"
                  className="text-xs font-bold text-content shrink-0"
                >
                  Select Country ({filteredCountries.length}):
                </label>
                <select
                  id="vault-country-select"
                  value={countryCode}
                  onChange={(e) => handleSelectCountry(e.target.value)}
                  className="w-full sm:max-w-xs rounded-xl border border-line bg-surface-muted px-3 py-2 text-xs font-semibold text-content outline-none transition focus:border-[#D6952F] dark:bg-[#081B33] dark:text-white"
                >
                  <option value="">
                    {continent && continent !== 'remote'
                      ? `All countries in ${CONTINENT_OPTIONS.find((c) => c.key === continent)?.label}`
                      : 'All Countries (Worldwide)'}
                  </option>
                  {filteredCountries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick International Hub Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-content-faint mr-1">
                  Global Hubs:
                </span>
                {QUICK_HUBS.map((hub) => {
                  const active = countryCode === hub.isoCode;
                  return (
                    <button
                      key={hub.isoCode}
                      type="button"
                      onClick={() => handleSelectCountry(active ? '' : hub.isoCode)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                        active
                          ? 'border-[#D6952F] bg-[#D6952F] text-[#061B36]'
                          : 'border-line bg-surface-muted text-content-muted hover:border-[#D6952F]/60 hover:text-content dark:bg-white/5'
                      }`}
                    >
                      <span>{hub.flag}</span>
                      <span>{hub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Live Recommendation Feedback Bar */}
        <div className="mt-6 pt-5 border-t border-line/60">
          {hasSelection ? (
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
                      ? `Found ${recommended.size} matching global vault${recommended.size > 1 ? 's' : ''}`
                      : 'No exact vault matches found'}
                  </p>
                  <p className="text-xs text-content-muted">
                    {recommended.size > 0
                      ? 'The vaults highlighted with "Recommended For You" match your selected international criteria.'
                      : 'Showing all vaults. Try broadening your continent, country, or experience selection.'}
                  </p>
                </div>
              </div>

              {recommended.size > 0 && onToggleOnlyRecommended && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleOnlyRecommended(!onlyRecommended)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
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
                Select an experience level, continent, or country above to spotlight matching international vaults below.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
