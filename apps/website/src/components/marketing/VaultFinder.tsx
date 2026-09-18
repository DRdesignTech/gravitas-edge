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
  location: LocationOption | null;
}): Set<string> {
  const { experience, location } = options;
  if (!experience || !location) return new Set();
  const recommended = vaults
    .filter((vault) => {
      const fit = getVaultFit(vault);
      const experienceMatch = fit.experience === 'any' || fit.experience === experience;
      const locationMatch = fit.locations.includes(location);
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
      className={`inline-flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-200'
          : 'border-line bg-surface text-content hover:border-brand-300 hover:bg-surface-muted dark:bg-surface dark:hover:border-brand-700'
      }`}
    >
      {label}
      {selected && <CheckIcon className="h-4 w-4 shrink-0" />}
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
  const [location, setLocation] = useState<LocationOption | null>(null);

  useEffect(() => {
    onRecommendedChange(findRecommendedVaults(vaults, { experience, location }));
  }, [vaults, experience, location, onRecommendedChange]);

  const reset = () => {
    setExperience(null);
    setLocation(null);
    onRecommendedChange(new Set());
  };

  const hasSelection = experience !== null || location !== null;

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow>VAULT FINDER</Eyebrow>
          <h3 className="mt-3 text-xl font-bold tracking-tight text-content sm:text-2xl">
            Find the right Opportunity Vault
          </h3>
          <p className="mt-2 text-sm text-content-muted sm:text-base">
            Answer two quick questions and we&apos;ll highlight the vaults most relevant to your
            experience level and preferred location. All vaults remain visible below.
          </p>
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-content-muted transition-colors hover:border-brand-300 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <CloseIcon className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-semibold text-content">Your experience level?</legend>
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
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-content">Preferred location?</legend>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {LOCATION_OPTIONS.map((option) => (
              <OptionButton
                key={option.key}
                label={option.label}
                selected={location === option.key}
                onSelect={() => setLocation(option.key)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {experience && location ? (
        <p className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {recommended.size > 0 ? (
            <>
              Based on your answers, the vault
              {recommended.size > 1 ? 's marked' : ' marked'} <strong>&ldquo;Recommended for
              you&rdquo;</strong> below {recommended.size > 1 ? 'are' : 'is'} the best match
              {recommended.size > 1 ? 'es' : ''} for your search.
            </>
          ) : (
            <>We couldn&apos;t find a vault matching your answers. All vaults are shown below.</>
          )}
        </p>
      ) : (
        <p className="mt-7 text-sm text-content-faint">
          Select an option for both questions to see your recommended vaults.
        </p>
      )}
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