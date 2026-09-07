'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchOpportunity } from '@/lib/services';
import { Opportunity } from '@/lib/types';
import { Badge, Button, Card, Skeleton, EmptyState, AccessBadge, LockIcon } from '@/components/ui';
import { PinIcon, BriefcaseIcon, LayersIcon } from '@/components/cards';
import ContentProtection from '@/components/ContentProtection';
import { formatDate, titleCase, experienceLabel } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wider text-content-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-content">{value}</dd>
    </div>
  );
}

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                <Link href="/opportunities">
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <span aria-hidden>←</span> Back to opportunities
      </Link>

      <ContentProtection>
        <header className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {o.isPremium ? (
              <Badge variant="premium">Premium</Badge>
            ) : (
              <Badge variant="success">Free</Badge>
            )}
            <Badge variant="info">{titleCase(o.category)}</Badge>
            {o.employmentType && <Badge variant="neutral">{titleCase(o.employmentType)}</Badge>}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-content sm:text-4xl">
            {o.title}
          </h1>
          {o.company && <p className="mt-2 text-lg text-content-muted">{o.company}</p>}
        </header>

        <Card className="mt-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {o.location && <DetailRow label="Location" value={o.location} />}
            <DetailRow
              label="Experience"
              value={experienceLabel(o.minExperience, o.maxExperience)}
            />
            {o.industry && <DetailRow label="Industry" value={o.industry} />}
            {o.functionalArea && <DetailRow label="Function" value={o.functionalArea} />}
            <DetailRow label="Published" value={formatDate(o.publishedDate)} />
            <DetailRow label="Expires" value={formatDate(o.expiryDate)} />
          </dl>
        </Card>

        {o.description && (
          <Card title="About this role" className="mt-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-content">
              {o.description}
            </p>
          </Card>
        )}
      </ContentProtection>

      {/* Access / apply */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {o.isPremium && <AccessBadge locked={false} />}
        </div>
        {o.applicationUrl ? (
          <a
            href={o.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:ml-auto"
          >
            <Button>Apply now</Button>
          </a>
        ) : o.applicationContact ? (
          <a href={`mailto:${o.applicationContact}`} className="sm:ml-auto">
            <Button>Contact {o.applicationContact}</Button>
          </a>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-content-faint">
        <span className="inline-flex items-center gap-1.5">
          <PinIcon className="h-4 w-4" /> {o.location || 'Remote'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BriefcaseIcon className="h-4 w-4" /> {titleCase(o.employmentType)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LayersIcon className="h-4 w-4" /> {experienceLabel(o.minExperience, o.maxExperience)}
        </span>
      </div>
    </div>
  );
}
