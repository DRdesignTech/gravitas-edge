'use client';

import { useEffect, useState } from 'react';
import { Vault } from '@/lib/types';
import Eyebrow from '@/components/marketing/Eyebrow';

export type ExperienceOption = 'early' | 'mid' | 'senior' | 'executive';
export type LocationOption = 'india' | 'uae' | 'global' | 'remote';

const EXPERIENCE_OPTIONS: { key: ExperienceOption; label: string }[] = [
  { key: 'early', label: '0–5 years' },
  { key: 'mid', label: '5–10 years' },
  { key: 'senior', label: '10+ years' },
  { key: 'executive', label: 'Executive (C-suite)' },
];

const LOCATION_OPTIONS: { key: LocationOption; label: string }[] = [
  { key: 'india', label: 'India' },
  { key: 'uae', label: 'UAE' },
  { key: 'global', label: 'Global' },
  { key: 'remote', label: 'Remote' },
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

export function findRecommendedVaults(vaults: Vault[], options: {
  experience: ExperienceOption | null;
  locations: LocationOption[];
}): Set<string> {
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

function OptionButton({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`inline-flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        selected
          ? 'border-brand-400 bg-gradient-to-br from-[#0d325c] to-[#061B36] text-white shadow-[0_12px_26px_-16px_rgba(6,27,54,0.9)]'
          : 'border-line bg-surface text-content hover:border-brand-400/60 hover:bg-surface-muted dark:bg-surface-elevated dark:hover:bg-surface'
      }`}
    >
      {label}
      {selected && <CheckIcon className="h-4 w-4 shrink-0 text-[#E3B968]" />}
    </button>
  );
}

export default function VaultFinder({
  vaults,
  recommended,
  onRecommendedChange,
}: {
  vaults: Vault[];
  recommended: Set<string>;
  onRecommendedChange: (ids: Set<string>) => void;
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
  };

  const hasSelection = experience !== null || locations.length > 0;
  const answered = experience !== null && locations.length > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface to-surface-muted p-6 shadow-card dark:from-surface-elevated dark:to-surface sm:p-8">
      {/* Decorative background — CSS only */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(200,148,62,0.14), transparent 68%)' }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full border border-brand-400/20"
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d325c] to-brand-600 text-[#E3B968] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] ring-1 ring-inset ring-brand-400/35">
                <CompassIcon className="h-5 w-5" />
              </span>
              <Eyebrow>VAULT FINDER</Eyebrow>
            </span>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Build around where you are. And where you want to go.
            </h3>
            <p className="mt-2 text-sm text-content-muted sm:text-base">
              Opportunity curated by experience level &amp; market location.
            </p>
          </div>
          {hasSelection && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-content-muted transition-colors hover:border-brand-400/60 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-surface-elevated"
            >
              <CloseIcon className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <div role="group" aria-labelledby="vf-experience-label">
            <p id="vf-experience-label" className="text-sm font-semibold text-content">
              Your experience level?
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {EXPERIENCE_OPTIONS.map((option) => (
                <OptionButton
                  key={option.key}
                  label={option.label}
                  selected={experience === option.key}
                  onSelect={() => setExperience(option.key)}
                />
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="vf-location-label">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p id="vf-location-label" className="text-sm font-semibold text-content">
                Preferred location(s)?
              </p>
              <span className="text-xs font-medium text-content-faint">Select one or more</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {LOCATION_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleLocation(option.key)}
                  aria-pressed={locations.includes(option.key)}
                  className={`inline-flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                    locations.includes(option.key)
                      ? 'border-brand-400 bg-gradient-to-br from-[#0d325c] to-[#061B36] text-white shadow-[0_12px_26px_-16px_rgba(6,27,54,0.9)]'
                      : 'border-line bg-surface text-content hover:border-brand-400/60 hover:bg-surface-muted dark:bg-surface-elevated dark:hover:bg-surface'
                  }`}
                >
                  {option.label}
                  {locations.includes(option.key) && (
                    <CheckIcon className="h-4 w-4 shrink-0 text-[#E3B968]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {answered ? (
          <p
            className={`mt-7 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
              recommended.size > 0
                ? 'border-brand-400/35 bg-gradient-to-br from-brand-50/70 to-surface text-content dark:border-brand-400/25 dark:from-brand-950/40 dark:to-surface'
                : 'border-line bg-surface-muted text-content-muted dark:bg-surface'
            }`}
          >
            {recommended.size > 0 ? (
              <>
                <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>
                  Based on your answers, the vault
                  {recommended.size > 1 ? 's marked' : ' marked'}{' '}
                  <strong className="font-semibold text-content">&ldquo;Recommended for you&rdquo;</strong>{' '}
                  below {recommended.size > 1 ? 'are' : 'is'} the best match
                  {recommended.size > 1 ? 'es' : ''} for your search.
                </span>
              </>
            ) : (
              <>
                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-content-faint" />
                <span>We couldn&apos;t find a vault matching your answers. All vaults are shown below.</span>
              </>
            )}
          </p>
        ) : (
          <p className="mt-7 flex items-center gap-2 text-sm text-content-faint">
            <InfoIcon className="h-4 w-4 shrink-0" />
            Select an option for both questions to see your recommended vaults.
          </p>
        )}
      </div>
    </div>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CompassIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon
        points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l1.1 5.5L18 9l-4.9 1.5L12 16l-1.1-5.5L6 9l4.9-1.5L12 2zm6.5 10l.6 2.9L22 15l-2.9.9L18.5 19l-.6-3.1L15 15l2.9-.9L18.5 12zM5.5 12l.6 2.9L9 15l-2.9.9L5.5 19l-.6-3.1L2 15l2.9-.9L5.5 12z" />
    </svg>
  );
}

function InfoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v5.25M12 7.75h.008v.008H12V7.75z" />
    </svg>
  );
}
