'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Skeleton, useToast } from '@/components/ui';
import { ArrowLeftIcon, CopyIcon, ExternalLinkIcon } from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import { getErrorMessage } from '@/lib/errors';
import { fetchRvaOpportunity } from '@/lib/services';
import { RvaOpportunity } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { extractEmail, buildApplyMailto } from '@job-portal/shared';

const FIELDS = [
  { key: 'serialNo', label: 'S. No.' },
  { key: 'jobId', label: 'Job ID' },
  { key: 'publishedDate', label: 'Date' },
  { key: 'categoryLabel', label: 'Opportunity Type' },
  { key: 'organization', label: 'Organisation' },
  { key: 'sector', label: 'Industry' },
  { key: 'geography', label: 'Geography' },
  { key: 'requirements', label: 'Vendor Requirement / Scope' },
  { key: 'eligibility', label: 'Eligibility / Vendor Criteria' },
  { key: 'expiryDate', label: 'Deadline' },
  { key: 'applicationContact', label: 'Contact Person' },
  { key: 'otherDetails', label: 'Other Details' },
  { key: 'howToApply', label: 'How to Apply' },
] as const;

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return (
    <div className="border-t border-line px-4 py-4 sm:px-6">
      <div className="grid gap-2 sm:grid-cols-3">
        <dt className="text-sm font-semibold text-content-muted sm:col-span-1">{label}</dt>
        <dd className="text-sm leading-relaxed text-content sm:col-span-2 whitespace-pre-line">{value}</dd>
      </div>
    </div>
  );
}

function displayValue(key: (typeof FIELDS)[number]['key'], o: RvaOpportunity) {
  switch (key) {
    case 'serialNo':
      return o.serialNo;
    case 'jobId':
      return o.jobId;
    case 'publishedDate':
      return o.publishedDate ? new Date(o.publishedDate).toLocaleDateString('en-IN') : null;
    case 'categoryLabel':
      return o.categoryLabel;
    case 'organization':
      return o.organization || o.company;
    case 'sector':
      return o.sector;
    case 'geography':
      return o.geography || o.location;
    case 'requirements':
      return o.requirements;
    case 'eligibility':
      return o.eligibility;
    case 'expiryDate':
      return o.expiryDate ? new Date(o.expiryDate).toLocaleDateString('en-IN') : null;
    case 'applicationContact':
      return o.applicationContact;
    case 'otherDetails':
      return o.otherDetails;
    case 'howToApply':
      return o.howToApply;
    default:
      return null;
  }
}

export default function RvaJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { showToast } = useToast();
  const { user, hasRvaAccess } = useAuth();

  const [opportunity, setOpportunity] = useState<RvaOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchRvaOpportunity(id);
      setOpportunity(res);
    } catch (e) {
      setError(getErrorMessage(e));
      showToast(getErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const rvaEntitled = hasRvaAccess === true;
  const isFullAccess = opportunity?.isFullAccess === true && rvaEntitled;

  const email = useMemo(() => {
    if (!opportunity) return null;
    return extractEmail(
      isFullAccess ? opportunity.applicationContact : null,
      isFullAccess ? opportunity.howToApply : null,
      opportunity.applicationUrl,
    );
  }, [isFullAccess, opportunity]);

  const mailto = useMemo(() => {
    if (!email || !opportunity) return null;
    return buildApplyMailto(email, {
      title: opportunity.title,
      company: opportunity.organization || opportunity.company,
    });
  }, [email, opportunity]);

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied to clipboard', 'success');
    } catch {
      showToast('Unable to copy email', 'error');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-4 h-6 w-1/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <div className="mt-8 rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
          <p className="text-sm text-content-muted">{error || 'Opportunity not found'}</p>
          <Link href="/recruitment-vendor/jobs">
            <Button className="mt-4">Back to list</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-clip">
      <section className="border-b border-line bg-surface-muted/60">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to opportunities
              </button>
              <h1 className="mt-4 font-serif-heading text-2xl font-bold leading-tight text-content sm:text-3xl">{opportunity.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-content-muted">
                <Badge variant="info">{opportunity.categoryLabel}</Badge>
                {(opportunity.organization || opportunity.company) && (
                  <span>{opportunity.organization || opportunity.company}</span>
                )}
                {(opportunity.geography || opportunity.location) && (
                  <span>· {opportunity.geography || opportunity.location}</span>
                )}
                {opportunity.jobId && <span>· Job ID: {opportunity.jobId}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!user && (
                <Link href={`/login?redirect=/recruitment-vendor/jobs/${opportunity.id}`}>
                  <Button variant="outline">Sign in to view full details</Button>
                </Link>
              )}
              {user && !rvaEntitled && (
                <Link href="/recruitment-vendor#plans">
                  <Button>Purchase RVA Access</Button>
                </Link>
              )}
              {isFullAccess && email && mailto && (
                <>
                  <Button onClick={copyEmail} className="gap-2">
                    <CopyIcon className="h-4 w-4" />
                    Copy Email
                  </Button>
                  <a href={mailto} target="_blank" rel="noopener noreferrer">
                    <Button className="gap-2">
                      Apply Now
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  </a>
                </>
              )}
              {isFullAccess && email && !mailto && (
                <Button onClick={copyEmail} className="gap-2">
                  <CopyIcon className="h-4 w-4" />
                  Copy Email
                </Button>
              )}
              {isFullAccess && !email && (
                <Button variant="ghost" disabled>
                  Email not available
                </Button>
              )}
            </div>
          </div>

          {user && !rvaEntitled && (
            <div className="mt-6 rounded-xl border border-[#C8943E]/30 bg-[#FFF3D9] px-4 py-3 text-sm text-[#7A5A1E] dark:border-[#C8943E]/30 dark:bg-brand-950 dark:text-brand-200">
              Full commercial, contact and application details are locked. Purchase an active Recruitment Vendor Access subscription to unlock them.
            </div>
          )}
        </div>
      </section>

      <section className="section-glow relative">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:bg-surface-elevated">
            <div className="px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-content">Opportunity details</h2>
              <p className="mt-1 text-sm text-content-muted">Showing all 13 source fields as required.</p>
            </div>
            <dl>
              {FIELDS.map((field) => (
                <InfoRow key={field.key} label={field.label} value={displayValue(field.key as any, opportunity)} />
              ))}
            </dl>
          </div>

          {isFullAccess && email && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={copyEmail} className="gap-2">
                <CopyIcon className="h-4 w-4" />
                Copy Email ({email})
              </Button>
              {mailto && (
                <a href={mailto} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2">
                    Apply Now
                    <ExternalLinkIcon className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          )}
          {isFullAccess && !email && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
              No verified email found in the source fields. “Copy Email” and “Apply Now” are disabled.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
