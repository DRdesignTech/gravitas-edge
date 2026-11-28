'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchOpportunities, fetchOpportunity } from '@/lib/services';
import { Opportunity } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import {
  canRevealCompanyExperience,
  isCompanyWithheld,
  isExperienceWithheld,
} from '@/lib/opportunity-access';
import {
  displayExperience,
  formatDate,
  hasExperience,
  isMeaningful,
  titleCase,
} from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { buildApplyMailto, extractEmail } from '@job-portal/shared';
import {
  HiAcademicCap,
  HiArrowLeft,
  HiArrowRight,
  HiArrowTopRightOnSquare,
  HiBanknotes,
  HiBriefcase,
  HiBuildingOffice2,
  HiCheckBadge,
  HiClock,
  HiDocumentArrowUp,
  HiGlobeAlt,
  HiLockClosed,
  HiLockOpen,
  HiMapPin,
  HiSparkles,
  HiUserCircle,
} from 'react-icons/hi2';

interface CourseRec {
  title: string;
  provider: string;
  duration: string;
  query: string;
}

function getRecommendedSkillsAndCourses(o: Opportunity | null): {
  skills: string[];
  courses: CourseRec[];
} {
  const haystack = `${o?.title || ''} ${o?.industry || ''} ${o?.functionalArea || ''}`.toLowerCase();

  if (haystack.includes('ai') || haystack.includes('ml') || haystack.includes('data') || haystack.includes('cloud') || haystack.includes('tech') || haystack.includes('architect') || haystack.includes('engineer')) {
    return {
      skills: [
        'Enterprise AI Architecture',
        'Cloud Platform Strategy',
        'Distributed Systems',
        'Executive Tech Governance',
        'MLOps & Scaling',
        'Stakeholder Alignment',
      ],
      courses: [
        {
          title: 'Generative AI for Executive Leaders',
          provider: 'Coursera · DeepLearning.AI',
          duration: '4 Weeks · Self-paced',
          query: 'Generative AI for Leaders',
        },
        {
          title: 'Cloud Architecture & Enterprise Security',
          provider: 'Coursera · Google Cloud',
          duration: '6 Weeks · Certificate',
          query: 'Cloud Architecture Enterprise',
        },
        {
          title: 'Technology Strategy & Digital Transformation',
          provider: 'Coursera · Wharton / INSEAD',
          duration: '5 Weeks · Executive',
          query: 'Digital Transformation Strategy',
        },
      ],
    };
  }

  if (haystack.includes('finance') || haystack.includes('equity') || haystack.includes('bank') || haystack.includes('risk') || haystack.includes('investment') || haystack.includes('cfo')) {
    return {
      skills: [
        'M&A & Capital Allocation',
        'Board Financial Reporting',
        'Cross-Border Tax & Risk',
        'Portfolio Valuation',
        'Treasury & Liquidity',
        'Investor Relations',
      ],
      courses: [
        {
          title: 'Private Equity & Venture Capital Strategy',
          provider: 'Coursera · Bocconi',
          duration: '5 Weeks · Certificate',
          query: 'Private Equity Venture Capital',
        },
        {
          title: 'Corporate Finance & Executive Valuation',
          provider: 'Coursera · Wharton',
          duration: '4 Weeks · Self-paced',
          query: 'Corporate Finance Valuation',
        },
        {
          title: 'Global Financial Risk Management',
          provider: 'Coursera · New York Institute',
          duration: '6 Weeks · Executive',
          query: 'Financial Risk Management',
        },
      ],
    };
  }

  return {
    skills: [
      'P&L Ownership',
      'Cross-Border Operations',
      'Boardroom Communication',
      'Strategic Partnerships',
      'Change Management',
      'Executive Decision-Making',
    ],
    courses: [
      {
        title: 'Global Executive Leadership & Strategy',
        provider: 'Coursera · University of Michigan',
        duration: '5 Weeks · Certificate',
        query: 'Executive Leadership Strategy',
      },
      {
        title: 'Strategic Negotiation & Stakeholder Influence',
        provider: 'Coursera · Yale / Wharton',
        duration: '4 Weeks · Self-paced',
        query: 'Executive Negotiation Strategy',
      },
      {
        title: 'Scaling Global Operations & Governance',
        provider: 'Coursera · IE Business School',
        duration: '6 Weeks · Executive',
        query: 'Global Operations Strategy',
      },
    ],
  };
}

export default function DashboardOpportunityWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasVaultAccess = useMemo(() => {
    return Boolean(
      user?.subscriptions?.some(
        (s) => s.status === 'ACTIVE' && new Date(s.endDate).getTime() > Date.now(),
      ),
    );
  }, [user]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      fetchOpportunity(id),
      fetchOpportunities({ limit: 30, sortBy: 'createdAt', sortOrder: 'desc' }),
    ])
      .then(([opp, listRes]) => {
        if (cancelled) return;
        setOpportunity(opp);
        setAllOpportunities(Array.isArray(listRes?.items) ? listRes.items : []);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const relatedOpportunities = useMemo(() => {
    if (!opportunity) return allOpportunities.slice(0, 8);
    const others = allOpportunities.filter((item) => item.id !== opportunity.id);
    const scored = others.map((item) => {
      let score = 0;
      if (opportunity.industry && item.industry === opportunity.industry) score += 2;
      if (opportunity.country && item.country === opportunity.country) score += 1;
      return { item, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item).slice(0, 8);
  }, [allOpportunities, opportunity]);

  const { skills, courses } = useMemo(
    () => getRecommendedSkillsAndCourses(opportunity),
    [opportunity],
  );

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-3" />
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-6" />
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          message={error || 'Opportunity not found'}
          onRetry={() => window.location.reload()}
        />
        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#D6952F] hover:underline"
          >
            <HiArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const canReveal = canRevealCompanyExperience(opportunity, hasVaultAccess);
  const companyHidden = isCompanyWithheld(opportunity, hasVaultAccess);
  const expHidden = isExperienceWithheld(opportunity, hasVaultAccess);
  const email = extractEmail(opportunity.applicationContact, opportunity.applicationUrl);
  const isUnlocked = Boolean(opportunity.isFullAccess || hasVaultAccess);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#06142A] py-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E9E5DC] bg-white px-3.5 py-2 text-xs font-bold text-[#061B36] shadow-2xs transition hover:border-[#D6952F] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white"
          >
            <HiArrowLeft className="h-4 w-4 text-[#D6952F]" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#D6952F]/35 bg-[#D6952F]/10 px-3 py-1 text-[11px] font-bold text-[#9C6424] dark:text-[#F0C27B]">
              Executive Opportunity Workspace
            </span>
          </div>
        </div>

        {/* 3-Column Workspace Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* ───────────────────────────────────────────────────────────
              LEFTMOST COLUMN: SELECTED & RELATED OPPORTUNITIES
              ─────────────────────────────────────────────────────────── */}
          <aside className="space-y-4 lg:col-span-3 lg:sticky lg:top-20">
            {/* Selected Opportunity Card */}
            <div className="rounded-2xl border-2 border-[#D6952F] bg-gradient-to-br from-[#061B36] to-[#0D2B52] p-4 text-white shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D6952F] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#061B36]">
                  <HiSparkles className="h-3 w-3" />
                  Selected
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F0C27B]">
                  {isUnlocked ? (
                    <>
                      <HiLockOpen className="h-3.5 w-3.5" /> Unlocked
                    </>
                  ) : (
                    <>
                      <HiLockClosed className="h-3.5 w-3.5" /> Locked
                    </>
                  )}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-extrabold leading-snug text-white">
                {opportunity.title}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#C9D3EA]">
                <span className="inline-flex items-center gap-1">
                  <HiMapPin className="h-3.5 w-3.5 text-[#F0C27B]" />
                  {opportunity.location || opportunity.country || 'Global'}
                </span>
                {opportunity.industry && (
                  <span className="inline-flex items-center gap-1">
                    <HiBriefcase className="h-3.5 w-3.5 text-[#F0C27B]" />
                    {opportunity.industry}
                  </span>
                )}
              </div>
            </div>

            {/* Other Related Opportunities */}
            <Card className="rounded-2xl border border-[#E9E5DC] bg-white p-4 dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#061B36] dark:text-white">
                  Related Opportunities
                </h3>
                <span className="text-[11px] font-semibold text-[#8C9AC0]">
                  {relatedOpportunities.length}
                </span>
              </div>

              {relatedOpportunities.length === 0 ? (
                <EmptyState
                  title="No related roles"
                  description="Explore all roles in the directory."
                />
              ) : (
                <div className="space-y-2.5">
                  {relatedOpportunities.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/dashboard/opportunities/${rel.id}`}
                      className="group block rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-3 transition hover:border-[#D6952F] hover:bg-white dark:border-[#1E3557] dark:bg-[#081B33] dark:hover:bg-[#0C2240]"
                    >
                      <p className="text-xs font-bold leading-snug text-[#061B36] group-hover:text-[#D6952F] dark:text-white line-clamp-2">
                        {rel.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-[#5B6479] dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 truncate">
                          <HiMapPin className="h-3 w-3 shrink-0 text-[#D6952F]" />
                          {rel.country || 'Global'}
                        </span>
                        <HiArrowRight className="h-3 w-3 shrink-0 text-[#8C9AC0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#D6952F]" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </aside>

          {/* ───────────────────────────────────────────────────────────
              MIDDLE COLUMN: OPPORTUNITY DETAILS + PROFILE ENHANCEMENT
              ─────────────────────────────────────────────────────────── */}
          <main className="space-y-6 lg:col-span-6">
            {/* 1. Opportunity Details Section */}
            <section className="rounded-3xl border border-[#E9E5DC] bg-white p-6 shadow-sm sm:p-8 dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E5DC] pb-4 dark:border-[#1E3557]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] px-3 py-1 text-xs font-bold text-[#061B36] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-[#F0C27B]">
                  <HiGlobeAlt className="h-3.5 w-3.5 text-[#D6952F]" />
                  {opportunity.location
                    ? `${opportunity.location}${opportunity.country ? `, ${opportunity.country}` : ''}`
                    : opportunity.country || 'Global'}
                </span>

                {opportunity.publishedDate || opportunity.createdAt ? (
                  <span className="text-xs font-medium text-[#8C9AC0]">
                    Posted {formatDate(opportunity.publishedDate || opportunity.createdAt)}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#061B36] sm:text-3xl dark:text-white">
                {opportunity.title}
              </h1>

              {/* Key Metadata Grid */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 dark:border-[#1E3557] dark:bg-[#081B33]">
                  <HiBuildingOffice2 className="h-5 w-5 shrink-0 text-[#D6952F]" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Organization
                    </span>
                    <span className="block truncate text-xs font-bold text-[#061B36] dark:text-white">
                      {companyHidden
                        ? 'Protected (Unlock via Vault)'
                        : opportunity.company || 'Confidential Mandate'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 dark:border-[#1E3557] dark:bg-[#081B33]">
                  <HiClock className="h-5 w-5 shrink-0 text-[#D6952F]" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Experience
                    </span>
                    <span className="block truncate text-xs font-bold text-[#061B36] dark:text-white">
                      {expHidden
                        ? 'Tier Protected'
                        : hasExperience(
                              opportunity.experienceText,
                              opportunity.minExperience,
                              opportunity.maxExperience,
                            )
                          ? displayExperience(
                              opportunity.experienceText,
                              opportunity.minExperience,
                              opportunity.maxExperience,
                            )
                          : 'Executive Level'}
                    </span>
                  </div>
                </div>

                {opportunity.industry && (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 dark:border-[#1E3557] dark:bg-[#081B33]">
                    <HiBriefcase className="h-5 w-5 shrink-0 text-[#D6952F]" />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                        Industry
                      </span>
                      <span className="block truncate text-xs font-bold text-[#061B36] dark:text-white">
                        {opportunity.industry}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 dark:border-[#1E3557] dark:bg-[#081B33]">
                  <HiBanknotes className="h-5 w-5 shrink-0 text-[#D6952F]" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Compensation
                    </span>
                    <span className="block truncate text-xs font-bold text-[#061B36] dark:text-white">
                      {isMeaningful(opportunity.salary)
                        ? opportunity.salary
                        : 'Executive Package'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description & Details */}
              <div className="mt-6 space-y-5 text-sm leading-relaxed text-[#4A5568] dark:text-slate-300">
                {opportunity.description && (
                  <div>
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#061B36] dark:text-[#F0C27B]">
                      Role Overview
                    </h2>
                    <p className="mt-2 whitespace-pre-line">{opportunity.description}</p>
                  </div>
                )}

                {isMeaningful(opportunity.qualification) && (
                  <div>
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#061B36] dark:text-[#F0C27B]">
                      Qualifications &amp; Mandate Scope
                    </h2>
                    <p className="mt-2 whitespace-pre-line">{opportunity.qualification}</p>
                  </div>
                )}
              </div>

              {/* Direct Application / Unlock Box */}
              <div className="mt-6 rounded-2xl border border-[#D6952F]/40 bg-gradient-to-r from-[#061B36] to-[#0D2B52] p-5 text-white">
                {isUnlocked ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <HiLockOpen className="h-4 w-4" />
                        Direct Hiring Pathway Unlocked
                      </span>
                      <p className="mt-1 text-xs text-[#C9D3EA]">
                        {opportunity.applicationContact ||
                          'Direct executive contact is active for your subscription.'}
                      </p>
                    </div>
                    {email ? (
                      <a
                        href={buildApplyMailto(email, {
                          title: opportunity.title,
                          company: canReveal ? opportunity.company : undefined,
                        })}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#D6952F] px-4 py-2.5 text-xs font-extrabold text-[#061B36] transition hover:bg-[#F0C27B]"
                      >
                        Apply Directly
                        <HiArrowRight className="h-3.5 w-3.5" />
                      </a>
                    ) : opportunity.applicationUrl ? (
                      <a
                        href={opportunity.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#D6952F] px-4 py-2.5 text-xs font-extrabold text-[#061B36] transition hover:bg-[#F0C27B]"
                      >
                        Open Application
                        <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F0C27B]">
                        <HiLockClosed className="h-4 w-4" />
                        Direct Hiring Contact Protected
                      </span>
                      <p className="mt-1 text-xs text-[#C9D3EA]">
                        Activate a matching vault plan to reveal verified recruiter emails and apply directly.
                      </p>
                    </div>
                    <Link
                      href="/plans"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#D6952F] px-4 py-2.5 text-xs font-extrabold text-[#061B36] transition hover:bg-[#F0C27B]"
                    >
                      Unlock Access
                      <HiArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Profile Enhancement Section */}
            <section className="rounded-3xl border border-[#E9E5DC] bg-white p-6 shadow-sm sm:p-8 dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E5DC] pb-4 dark:border-[#1E3557]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B]">
                    <HiUserCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#061B36] dark:text-white">
                      Profile Enhancement for This Role
                    </h2>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400">
                      Tailor your executive profile and CV before reaching out to the hiring desk.
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/profile">
                  <Button size="sm" variant="outline" className="text-xs">
                    Update Profile →
                  </Button>
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#061B36] dark:text-white">
                    <HiCheckBadge className="h-4 w-4 text-emerald-600" />
                    Executive Positioning
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5B6479] dark:text-slate-300">
                    Lead your summary with scope matching{' '}
                    <strong className="text-[#061B36] dark:text-white">
                      {opportunity.title}
                    </strong>{' '}
                    ({opportunity.industry || 'Executive Leadership'}) and quantified P&amp;L or scale outcomes.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#061B36] dark:text-white">
                    <HiCheckBadge className="h-4 w-4 text-emerald-600" />
                    Cross-Border Readiness
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5B6479] dark:text-slate-300">
                    Highlight international corridor delivery, notice period, and relocation flexibility for{' '}
                    <strong className="text-[#061B36] dark:text-white">
                      {opportunity.country || 'Global'}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D6952F]/30 bg-[#FFF9ED] p-4 dark:border-[#D6952F]/25 dark:bg-[#081B33]">
                <div className="flex items-center gap-2.5">
                  <HiDocumentArrowUp className="h-5 w-5 shrink-0 text-[#D6952F]" />
                  <div>
                    <p className="text-xs font-bold text-[#061B36] dark:text-white">
                      Keep your latest CV ready for direct outreach
                    </p>
                    <p className="text-[11px] text-[#5B6479] dark:text-slate-400">
                      Manage or upload an updated executive resume in your vault profile.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/resumes"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#061B36] px-3.5 py-2 text-xs font-bold text-[#F0C27B] transition hover:bg-[#0D2B52]"
                >
                  Manage Resumes
                  <HiArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          </main>

          {/* ───────────────────────────────────────────────────────────
              RIGHTMOST COLUMN: RECOMMENDED SKILLS & COURSES
              ─────────────────────────────────────────────────────────── */}
          <aside className="space-y-4 lg:col-span-3 lg:sticky lg:top-20">
            {/* Recommended Skills */}
            <Card className="rounded-2xl border border-[#E9E5DC] bg-white p-5 dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D6952F]/15 text-[#D6952F]">
                  <HiSparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#061B36] dark:text-white">
                    Recommended Skills
                  </h3>
                  <p className="text-[11px] text-[#8C9AC0]">
                    High-signal competencies for this role
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E9E5DC] bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-semibold text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-200"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F]" />
                    {skill}
                  </span>
                ))}
              </div>
            </Card>

            {/* Recommended Courses */}
            <Card className="rounded-2xl border border-[#E9E5DC] bg-white p-5 dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B]">
                  <HiAcademicCap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#061B36] dark:text-white">
                    Recommended Courses
                  </h3>
                  <p className="text-[11px] text-[#8C9AC0]">
                    Curated executive upskilling
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {courses.map((course) => (
                  <a
                    key={course.title}
                    href={`https://www.coursera.org/search?query=${encodeURIComponent(course.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 transition hover:border-[#D6952F] hover:bg-white dark:border-[#1E3557] dark:bg-[#081B33] dark:hover:bg-[#0C2240]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold leading-snug text-[#061B36] group-hover:text-[#D6952F] dark:text-white">
                        {course.title}
                      </p>
                      <HiArrowTopRightOnSquare className="h-3.5 w-3.5 shrink-0 text-[#8C9AC0] group-hover:text-[#D6952F]" />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-[#5B6479] dark:text-slate-400">
                      {course.provider}
                    </p>
                    <span className="mt-2 inline-block rounded-md bg-[#D6952F]/12 px-2 py-0.5 text-[10px] font-bold text-[#9C6424] dark:text-[#F0C27B]">
                      {course.duration}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
