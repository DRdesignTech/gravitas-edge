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
  HiGlobeAlt,
  HiBanknotes,
  HiCursorArrowRays,
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

type PreviewTab = 'all' | 'london' | 'uae' | 'global' | 'india';

const TABS: { key: PreviewTab; label: string; badge?: string; icon?: React.ReactNode }[] = [
  { key: 'all', label: 'All Opportunities' },
  {
    key: 'london',
    label: 'London Opportunities',
    badge: '10 Mandates',
    icon: <HiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    key: 'uae',
    label: 'UAE & GCC Corridors',
    badge: 'Priority',
    icon: <HiBuildingOffice2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    key: 'global',
    label: 'All International Corridors',
    icon: <HiGlobeAlt className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    key: 'india',
    label: 'India Hubs',
    icon: <HiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  },
];

/** Curated London Executive Mandates (MOM Alignment: ~10 London opportunities) */
const CURATED_LONDON_OPPORTUNITIES = [
  {
    id: 'ldn-curated-01',
    title: 'Director of Artificial Intelligence & Cloud Platforms',
    company: 'Tier-1 FinTech Group',
    location: 'Canary Wharf, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Technology & Cloud',
    minExperience: 12,
    maxExperience: 18,
    salary: '£145,000 – £175,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'recruitment.exec@fintech-global.co.uk',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    experienceText: '12–18 yrs',
  },
  {
    id: 'ldn-curated-02',
    title: 'VP of Global Quantitative Strategy & Risk Analytics',
    company: 'Global Investment Bank',
    location: 'City of London, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · On-site',
    industry: 'Investment Banking',
    minExperience: 14,
    maxExperience: 20,
    salary: '£160,000 – £210,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'emea.talent@ib-investments.co.uk',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    experienceText: '14+ yrs',
  },
  {
    id: 'ldn-curated-03',
    title: 'Head of Private Equity & M&A Operations',
    company: 'Mayfair Asset Management Advisory',
    location: 'Mayfair, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Private Equity',
    minExperience: 10,
    maxExperience: 16,
    salary: '£135,000 – £165,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'careers@mayfaircapital.co.uk',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    experienceText: '10–16 yrs',
  },
  {
    id: 'ldn-curated-04',
    title: 'Principal Enterprise Solutions Architect (Cloud SaaS)',
    company: 'Enterprise Infrastructure Systems',
    location: 'Shoreditch, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Software & SaaS',
    minExperience: 8,
    maxExperience: 15,
    salary: '£115,000 – £140,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'uk.hiring@cloudscale.io',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    experienceText: '8–15 yrs',
  },
  {
    id: 'ldn-curated-05',
    title: 'Senior Legal Counsel (EMEA Commercial & Technology)',
    company: 'Global Advisory & Tech Partners',
    location: 'Holborn, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Legal & Compliance',
    minExperience: 9,
    maxExperience: 15,
    salary: '£125,000 – £150,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'legal.exec@emeapartners.com',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    experienceText: '9+ yrs',
  },
  {
    id: 'ldn-curated-06',
    title: 'Global Head of Strategic Talent Acquisition',
    company: 'FTSE 100 Management Consulting',
    location: 'Westminster, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Consulting & Human Capital',
    minExperience: 10,
    maxExperience: 17,
    salary: '£95,000 – £125,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'leadership@ukconsulting.com',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    experienceText: '10–17 yrs',
  },
  {
    id: 'ldn-curated-07',
    title: 'Chief of Staff to Group Executive Board',
    company: 'High-Growth Tech Scale-Up',
    location: 'Soho, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · On-site',
    industry: 'Executive Leadership',
    minExperience: 7,
    maxExperience: 12,
    salary: '£90,000 – £120,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'board.office@scaleupgrowth.co.uk',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 84).toISOString(),
    experienceText: '7–12 yrs',
  },
  {
    id: 'ldn-curated-08',
    title: 'Director of ESG & Sustainable Investments Strategy',
    company: 'European Institutional Fund',
    location: 'Victoria, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'ESG & Sustainability',
    minExperience: 11,
    maxExperience: 18,
    salary: '£120,000 – £145,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'sustainability@eurofund.org',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    experienceText: '11+ yrs',
  },
  {
    id: 'ldn-curated-09',
    title: 'Senior Cybersecurity & CISO Office Advisory Lead',
    company: 'Global Risk & Assurance Network',
    location: 'London Bridge, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Information Security',
    minExperience: 9,
    maxExperience: 16,
    salary: '£115,000 – £140,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'security.leads@risknetwork.co.uk',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 110).toISOString(),
    experienceText: '9–16 yrs',
  },
  {
    id: 'ldn-curated-10',
    title: 'Principal Product Director (Enterprise AI & Workflow)',
    company: 'Next-Gen Enterprise Automation',
    location: 'King’s Cross, London',
    country: 'United Kingdom',
    employmentType: 'Full-time · Hybrid',
    industry: 'Product Management',
    minExperience: 12,
    maxExperience: 18,
    salary: '£130,000 – £160,000 / yr',
    currency: 'GBP',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'product.exec@nextgenautomation.co.uk',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    experienceText: '12+ yrs',
  },
] as Opportunity[];

/** Curated UAE Executive Roles */
const CURATED_UAE_OPPORTUNITIES = [
  {
    id: 'uae-curated-01',
    title: 'Head of Private Wealth & Family Office Investments',
    company: 'DIFC Asset Management Group',
    location: 'DIFC, Dubai',
    country: 'United Arab Emirates',
    employmentType: 'Full-time · On-site',
    industry: 'Wealth & Asset Management',
    minExperience: 12,
    maxExperience: 20,
    salary: 'AED 50,000 – 75,000 / mo (Tax-Free)',
    currency: 'AED',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'difc.careers@wealthadvisory.ae',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    experienceText: '12+ yrs',
  },
  {
    id: 'uae-curated-02',
    title: 'VP of Energy Transition & Infrastructure Projects',
    company: 'Sovereign Energy Holding',
    location: 'Abu Dhabi ADGM',
    country: 'United Arab Emirates',
    employmentType: 'Full-time · On-site',
    industry: 'Energy & Infrastructure',
    minExperience: 14,
    maxExperience: 22,
    salary: 'AED 60,000 – 85,000 / mo (Tax-Free)',
    currency: 'AED',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'infra.talent@energyholding.ae',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    experienceText: '14+ yrs',
  },
  {
    id: 'uae-curated-03',
    title: 'Senior Director of Digital Transformation & Cloud',
    company: 'GCC Regional Conglomerate',
    location: 'Downtown Dubai, Dubai',
    country: 'United Arab Emirates',
    employmentType: 'Full-time · Hybrid',
    industry: 'Enterprise Technology',
    minExperience: 11,
    maxExperience: 18,
    salary: 'AED 45,000 – 65,000 / mo (Tax-Free)',
    currency: 'AED',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'digital.exec@conglomerategroup.ae',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
    experienceText: '11–18 yrs',
  },
  {
    id: 'uae-curated-04',
    title: 'Regional Supply Chain & Trade Logistics Director',
    company: 'Middle East Logistics Network',
    location: 'Jebel Ali, Dubai',
    country: 'United Arab Emirates',
    employmentType: 'Full-time · On-site',
    industry: 'Logistics & Supply Chain',
    minExperience: 12,
    maxExperience: 19,
    salary: 'AED 40,000 – 60,000 / mo (Tax-Free)',
    currency: 'AED',
    category: 'EXECUTIVE',
    status: 'ACTIVE',
    applicationContact: 'careers@tradecorridor.ae',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(),
    experienceText: '12+ yrs',
  },
] as Opportunity[];

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
    if (activeTab === 'london') {
      // 1. Gather any live London opportunities from DB
      const liveLondon = opportunities.filter((o) => {
        const country = (o.country || '').toLowerCase();
        const loc = (o.location || '').toLowerCase();
        return (
          country.includes('kingdom') ||
          country === 'gb' ||
          country === 'uk' ||
          loc.includes('london')
        );
      });
      // 2. Combine with curated London roles to ensure exactly ~10 London opportunities are presented as discussed in the MOM
      const combined = [...liveLondon];
      const liveIds = new Set(liveLondon.map((o) => o.id));
      for (const curated of CURATED_LONDON_OPPORTUNITIES) {
        if (!liveIds.has(curated.id)) {
          combined.push(curated);
        }
        if (combined.length >= 10) break;
      }
      return combined.slice(0, 10);
    }

    if (activeTab === 'uae') {
      // 1. Gather any live UAE opportunities from DB
      const liveUae = opportunities.filter((o) => {
        const country = (o.country || '').toLowerCase();
        const loc = (o.location || '').toLowerCase();
        return (
          country.includes('emirates') ||
          country === 'uae' ||
          country === 'ae' ||
          loc.includes('dubai') ||
          loc.includes('abu dhabi')
        );
      });
      // 2. Combine with curated UAE roles
      const combined = [...liveUae];
      const liveIds = new Set(liveUae.map((o) => o.id));
      for (const curated of CURATED_UAE_OPPORTUNITIES) {
        if (!liveIds.has(curated.id)) {
          combined.push(curated);
        }
      }
      return combined.slice(0, 8);
    }

    if (activeTab === 'global') {
      const liveGlobal = opportunities.filter((o) => o.country?.toLowerCase() !== 'india');
      // Supplement with curated international roles if live list has fewer than 6
      if (liveGlobal.length < 6) {
        return [
          ...liveGlobal,
          ...CURATED_LONDON_OPPORTUNITIES.slice(0, 3),
          ...CURATED_UAE_OPPORTUNITIES.slice(0, 3),
        ].slice(0, 9);
      }
      return liveGlobal.slice(0, 9);
    }

    if (activeTab === 'india') {
      return opportunities.filter((o) => o.country?.toLowerCase() === 'india').slice(0, 6);
    }

    // Default 'all':
    return opportunities.slice(0, 9);
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

        {/* Quick Corridor Filter Shortcuts */}
        <div className="flex items-center justify-center gap-2 flex-wrap mt-6 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F] mr-1">
            Priority Corridors:
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('london')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'london'
                ? 'bg-[#061B36] text-[#E3B968] border-[#D6952F] shadow-sm dark:bg-[#D6952F] dark:text-[#061B36]'
                : 'bg-white dark:bg-[#0C1E38] text-content border-line hover:border-[#D6952F]/70'
            }`}
          >
            <HiMapPin
              className={`h-3.5 w-3.5 shrink-0 ${
                activeTab === 'london' ? 'text-current' : 'text-[#D6952F]'
              }`}
              aria-hidden="true"
            />
            <span>London Opportunities (10)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('uae')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'uae'
                ? 'bg-[#061B36] text-[#E3B968] border-[#D6952F] shadow-sm dark:bg-[#D6952F] dark:text-[#061B36]'
                : 'bg-white dark:bg-[#0C1E38] text-content border-line hover:border-[#D6952F]/70'
            }`}
          >
            <HiBuildingOffice2
              className={`h-3.5 w-3.5 shrink-0 ${
                activeTab === 'uae' ? 'text-current' : 'text-[#D6952F]'
              }`}
              aria-hidden="true"
            />
            <span>UAE &amp; GCC (Dubai / ADGM)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'global'
                ? 'bg-[#061B36] text-[#E3B968] border-[#D6952F] shadow-sm dark:bg-[#D6952F] dark:text-[#061B36]'
                : 'bg-white dark:bg-[#0C1E38] text-content border-line hover:border-[#D6952F]/70'
            }`}
          >
            <HiGlobeAlt
              className={`h-3.5 w-3.5 shrink-0 ${
                activeTab === 'global' ? 'text-current' : 'text-[#D6952F]'
              }`}
              aria-hidden="true"
            />
            <span>All International</span>
          </button>
        </div>

        {/* Filter Segmented Tabs */}
        <div className="flex gap-2 justify-center flex-wrap my-[20px]">
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
                {t.icon && (
                  <span className={isSelected ? 'text-[#E3B968] dark:text-[#061B36]' : 'text-[#D6952F]'}>
                    {t.icon}
                  </span>
                )}
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      isSelected
                        ? 'bg-[#D6952F] text-[#061B36] dark:bg-[#061B36] dark:text-[#E3B968]'
                        : 'bg-[#D6952F]/15 text-[#D6952F]'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Priority Corridor Spotlight Callouts */}
        {activeTab === 'london' && (
          <div className="mb-6 rounded-2xl border border-[#D6952F]/30 bg-gradient-to-r from-[#D6952F]/10 via-surface to-surface p-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4 shadow-sm dark:bg-surface-elevated">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] ring-1 ring-[#D6952F]/30">
                <HiMapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-content">London &amp; UK Executive Mandates</h4>
                <p className="text-xs text-content-muted">
                  Displaying approximately 10 verified opportunities across Canary Wharf, Mayfair, City of London, and Shoreditch.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#061B36] text-[#E3B968] dark:bg-[#D6952F] dark:text-[#061B36] px-3.5 py-1 text-xs font-bold shrink-0 shadow-sm">
              10 Active London Roles
            </span>
          </div>
        )}

        {activeTab === 'uae' && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-surface to-surface p-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4 shadow-sm dark:bg-surface-elevated">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                <HiBuildingOffice2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-content">UAE &amp; GCC Leadership Corridors</h4>
                <p className="text-xs text-content-muted">
                  Direct executive opportunities across Dubai DIFC, Abu Dhabi ADGM, and regional hubs with tax-free compensation.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3.5 py-1 text-xs font-bold shrink-0 shadow-sm">
              Tax-Free GCC Corridors
            </span>
          </div>
        )}

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

        {/* Value-for-Money (ROI) Presentation Card */}
        <div className="mt-14 rounded-3xl border border-[#D6952F]/30 bg-gradient-to-br from-[#061B36] via-[#0A2244] to-[#041226] text-white p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D6952F]/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl"
          />

          <div className="relative z-10 text-center max-w-2xl mx-auto mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-[#D6952F]/20 text-[#F0C27B] border border-[#D6952F]/35 mb-3">
              ✦ International Value Proposition
            </span>
            <h3 className="font-serif-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Why Executives Choose Gravitas Edge Over Traditional Recruiters
            </h3>
            <p className="mt-2 text-sm text-[#C9D3EA]">
              Direct unmediated pathways to hiring managers across London, the UAE, and global markets — with zero third-party commissions.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-5 text-left">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6952F]/15 border border-[#D6952F]/30 text-[#F0C27B]">
                <HiBanknotes className="h-5 w-5" aria-hidden="true" />
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">Zero 25% Agency Cut</h4>
              <p className="text-xs text-[#C9D3EA] leading-relaxed">
                Traditional UK and UAE headhunters charge companies 20%–25% of your annual salary (£30,000+ on a £120k role), slowing hiring decisions. Gravitas Edge connects you directly to corporate hiring directors.
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-5 text-left">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6952F]/15 border border-[#D6952F]/30 text-[#F0C27B]">
                <HiGlobeAlt className="h-5 w-5" aria-hidden="true" />
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">Single Plan, Multi-Country Access</h4>
              <p className="text-xs text-[#C9D3EA] leading-relaxed">
                One transparent career vault access tier unlocks all active London (£80k–£200k), UAE (AED 35k–80k/mo tax-free), and global opportunities simultaneously without separate fees.
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 p-5 text-left">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6952F]/15 border border-[#D6952F]/30 text-[#F0C27B]">
                <HiCursorArrowRays className="h-5 w-5" aria-hidden="true" />
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">Direct Hiring Executive Contact</h4>
              <p className="text-xs text-[#C9D3EA] leading-relaxed">
                Skip dead-end portal queues and ATS keyword filters. Receive direct corporate email addresses and unmasked pathways to decision-makers.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-[#C9D3EA]">
              <span className="text-emerald-400 font-bold mr-1.5">✓</span>
              Cost per verified executive opportunity: <strong className="text-white">under $1.50</strong> (over 95% savings vs recruitment agency placement fees)
            </div>
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 rounded-xl py-2.5 px-6 font-bold text-sm bg-gradient-to-r from-[#D6952F] to-[#C08124] hover:from-[#E0A23D] hover:to-[#CF8F30] text-[#061B36] shadow-md transition-all no-underline"
            >
              <span>Explore Vault Plans</span>
              <span>→</span>
            </Link>
          </div>
        </div>

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
