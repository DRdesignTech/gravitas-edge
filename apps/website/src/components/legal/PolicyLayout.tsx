import type { ReactNode } from 'react';
import Eyebrow from '@/components/marketing/Eyebrow';

interface PolicyLayoutProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  children: ReactNode;
}

export default function PolicyLayout({
  eyebrow,
  title,
  lastUpdated,
  intro,
  children,
}: PolicyLayoutProps) {
  return (
    <div className="overflow-hidden">
      <section className="bg-[#061B36]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-16 sm:px-6 lg:px-10 lg:pt-24">
          <Eyebrow invert>{eyebrow}</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-200 sm:text-sm">
            Last Updated: {lastUpdated}
          </span>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          {intro && (
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated sm:p-7">
              {intro}
            </div>
          )}
          <div className="mt-10">{children}</div>
        </div>
      </section>
    </div>
  );
}

export function PolicySection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-line pt-10 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-bold tracking-tight text-content sm:text-2xl">
        <span className="mr-2 text-brand-600 dark:text-brand-400">{number}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PolicyText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-content-muted [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-brand-700 [&_a]:dark:text-brand-400">
      {children}
    </p>
  );
}

export function PolicyList({ items }: { items: ReactNode[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-[15px] leading-relaxed text-content-muted"
        >
          <span
            className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500/70"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PolicySubheading({ children }: { children: ReactNode }) {
  return <p className="mt-6 font-semibold text-content">{children}</p>;
}

interface ContactRow {
  label: string;
  value: string;
  href?: string;
}

export function PolicyContactBlock({ rows }: { rows: ContactRow[] }) {
  return (
    <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-content-muted">
            {row.label}
          </dt>
          <dd className="text-[15px] font-medium text-content">
            {row.href ? (
              <a
                href={row.href}
                className="text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
              >
                {row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </div>
  );
}

export function PolicyDivider() {
  return <div className="mt-6 border-t border-line pt-6" />;
}
