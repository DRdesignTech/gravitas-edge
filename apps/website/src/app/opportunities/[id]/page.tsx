'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchOpportunity } from '@/lib/services';
import { Opportunity } from '@/lib/types';
import { Badge, Button, Card, Skeleton, EmptyState, LockIcon } from '@/components/ui';
import { PinIcon, BriefcaseIcon, LayersIcon, GlobeIcon } from '@/components/cards';
import {
  formatDate,
  titleCase,
  displayExperience,
  hasExperience,
  isMeaningful,
} from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { previousInternalRoute } from '@/lib/navigation';

function DetailRow({
  label,
  value,
  isEmail,
}: {
  label: string;
  value?: React.ReactNode;
  isEmail?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  const stringValue = typeof value === 'string' ? value : String(value);
  // For locked preview masked values, apply email-aware formatting if needed
  const displayValue = isEmail && stringValue.includes('@') ? stringValue : stringValue;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-content-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-content truncate max-w-full break-words overflow-hidden">
        {displayValue}
      </dd>
    </div>
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — let the user copy from the mailto link.
    }
  };

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? 'Copied!' : 'Copy email'}
    </Button>
  );
}

function ContactRow({ email }: { email: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-content-muted">
        Reach the hiring team directly at{' '}
        <a
          href={`mailto:${email}`}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {email}
        </a>
      </p>
      <div className="flex items-center gap-2">
        <CopyEmailButton email={email} />
        <a href={`mailto:${email}`}>
          <Button variant="ghost">Open mail app</Button>
        </a>
      </div>
    </div>
  );
}

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Prefer a real browser Back when the visitor reached this page from an
   * internal route (exact previous page + scroll position preserved). Only fall
   * back to the hardcoded route when no internal history exists (e.g. the page
   * was opened directly).
   */
  const handleBack = (e: React.MouseEvent) => {
    if (previousInternalRoute()) {
      e.preventDefault();
      router.back();
    }
  };

  const load = () => {
    setLoading(true);
    setError('');
    fetchOpportunity(params.id)
      .then(setOpportunity)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-9 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/3" />
        <Skeleton className="mt-8 h-48" />
        <Skeleton className="mt-6 h-40" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="py-4">
          <EmptyState
            icon={<LockIcon className="h-6 w-6" />}
            title={opportunity ? 'In preview' : 'Opportunity not found'}
            description={
              opportunity
                ? 'This premium opportunity may require an active subscription.'
                : "We couldn't load this opportunity."
            }
            action={
              <>
                {error && (
                  <Button variant="outline" onClick={load}>
                    Try again
                  </Button>
                )}
                <Link href="/opportunities" onClick={handleBack}>
                  <Button variant="ghost">Back to opportunities</Button>
                </Link>
              </>
            }
          />
        </Card>
      </div>
    );
  }

  const o = opportunity;
  const singleVault = o.vaults && o.vaults.length === 1 ? o.vaults[0] : null;
  const backHref = singleVault
    ? o.isFullAccess
      ? `/opportunities?vaultId=${encodeURIComponent(singleVault.id)}`
      : `/vaults/${singleVault.id}`
    : '/opportunities';
  const backLabel = singleVault ? `← Back to ${singleVault.name}` : '← Back to opportunities';
  const source =
    o.source && o.source.trim() && o.source.trim().toLowerCase() !== 'not specified'
      ? o.source.trim()
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={backHref}
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <span aria-hidden>←</span> {backLabel}
      </Link>

      {/* Always visible: header + basic facts (from public API) */}
      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          {o.isPremium ? (
            <Badge variant="premium">Premium</Badge>
          ) : (
            <Badge variant="success">Open</Badge>
          )}
          <Badge variant="info">{titleCase(o.category)}</Badge>
          {o.employmentType && <Badge variant="neutral">{titleCase(o.employmentType)}</Badge>}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-content sm:text-4xl">
          {o.title}
        </h1>
        <p className="mt-2 text-lg text-content-muted">{o.company || 'Company not disclosed'}</p>
        {isMeaningful(o.salary) && (
          <p className="mt-3 text-xl font-bold text-brand-700 dark:text-brand-300">{o.salary}</p>
        )}
      </header>

      <Card className="mt-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {o.location && <DetailRow label="Location" value={o.location} />}
          {o.country && <DetailRow label="Country" value={o.country} />}
          {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
            <DetailRow
              label="Experience"
              value={displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
            />
          )}
          {o.industry && <DetailRow label="Industry" value={o.industry} />}
          {o.functionalArea && <DetailRow label="Function" value={o.functionalArea} />}
          {o.employmentType && (
            <DetailRow label="Employment type" value={titleCase(o.employmentType)} />
          )}
          {o.qualification && <DetailRow label="Qualification" value={o.qualification} />}
          <DetailRow label="Published" value={formatDate(o.publishedDate)} />
          <DetailRow label="Expires" value={formatDate(o.expiryDate)} />
        </dl>
      </Card>

      {o.isFullAccess === false ? (
        /* Subscription gate — fields 7-9 shown as safe masked teasers */
        <Card className="mt-6 border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/30">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <LockIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-content">Full job details locked</h2>
              <p className="mt-1 text-sm text-content-muted">
                Qualification, other details and how to apply for this role unlock with the relevant
                Vault access. What you see below is a masked preview — no original details are
                revealed.
              </p>
            </div>
            <Link
              href={singleVault ? `/vaults/${singleVault.id}` : '/plans'}
              className="shrink-0 sm:ml-auto"
            >
              <Button>Unlock Full Access</Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-2">
            {o.lockedPreview && (
              <>
                <DetailRow label="Qualification" value={o.lockedPreview.qualification} />
                <DetailRow label="Other Details" value={o.lockedPreview.otherDetails} />
                <DetailRow label="How to Apply" value={o.lockedPreview.howToApply} isEmail={true} />
                <DetailRow
                  label="Application Contact"
                  value={o.lockedPreview.applicationContact}
                  isEmail={true}
                />
              </>
            )}
          </div>
        </Card>
      ) : (
        /* Full access granted by the API */
        <>
          {o.description && (
            <Card title="About this role" className="mt-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-content">
                {o.description}
              </p>
            </Card>
          )}

          <Card
            title={o.applicationUrl ? 'Apply' : 'Direct contact'}
            className="mt-6"
            action={
              source && (
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-content-faint dark:bg-surface-muted/70">
                  {source}
                </span>
              )
            }
          >
            {o.applicationUrl ? (
              <div className="space-y-4">
                <a
                  href={o.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button>Apply now</Button>
                </a>
                {o.applicationContact && <ContactRow email={o.applicationContact} />}
              </div>
            ) : o.applicationContact ? (
              <ContactRow email={o.applicationContact} />
            ) : (
              <p className="text-sm text-content-muted">
                Contact details for this role are shared with subscribing members.
              </p>
            )}
          </Card>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-content-faint">
        {o.location && (
          <span className="inline-flex items-center gap-1.5">
            <PinIcon className="h-4 w-4" /> {o.location}
          </span>
        )}
        {o.country && (
          <span className="inline-flex items-center gap-1.5">
            <GlobeIcon className="h-4 w-4" /> {o.country}
          </span>
        )}
        {o.employmentType && (
          <span className="inline-flex items-center gap-1.5">
            <BriefcaseIcon className="h-4 w-4" /> {titleCase(o.employmentType)}
          </span>
        )}
        {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
          <span className="inline-flex items-center gap-1.5">
            <LayersIcon className="h-4 w-4" />{' '}
            {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
          </span>
        )}
      </div>
    </div>
  );
}
