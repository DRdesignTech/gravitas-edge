'use client';

import { usePathname, useRouter } from 'next/navigation';
import { RECRUITMENT_VENDOR_VAULT_NAME } from '@job-portal/shared';

interface VaultOption {
  key: 'opportunity' | 'rva';
  label: string;
  short: string;
  href: string;
}

const VAULTS: VaultOption[] = [
  { key: 'opportunity', label: 'Opportunity Vault', short: 'Opportunity', href: '/' },
  {
    key: 'rva',
    label: RECRUITMENT_VENDOR_VAULT_NAME,
    short: 'Recruitment Vendor',
    href: '/recruitment-vendor',
  },
];

/**
 * Switches the admin console between the Opportunity Vault and the Recruitment
 * Vendor Access vault. The two vaults are fully data-isolated; selecting one
 * navigates to its section and swaps the sidebar navigation. The active vault is
 * derived from the current route so it can never drift from the page rendered.
 */
export function VaultSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const active: VaultOption['key'] = pathname.startsWith('/recruitment-vendor')
    ? 'rva'
    : 'opportunity';

  return (
    <div
      role="tablist"
      aria-label="Select vault"
      className="inline-flex items-center rounded-lg border border-line bg-surface p-1 dark:bg-surface-elevated"
    >
      {VAULTS.map((vault) => {
        const isActive = vault.key === active;
        return (
          <button
            key={vault.key}
            role="tab"
            aria-selected={isActive}
            title={vault.label}
            onClick={() => {
              if (!isActive) router.push(vault.href);
            }}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
              isActive
                ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-[#061B36] shadow-sm'
                : 'text-content-muted hover:bg-surface-muted hover:text-content'
            }`}
          >
            <span className="sm:hidden">{vault.short}</span>
            <span className="hidden sm:inline">{vault.label}</span>
          </button>
        );
      })}
    </div>
  );
}
