import Link from 'next/link';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoCard from '@/components/marketing/InfoCard';

const steps = [
  {
    index: '01',
    title: 'Explore the live Free Preview',
    description:
      'Browse the current jobs without subscribing. Public details stay visible while company, source and application details remain locked.',
  },
  {
    index: '02',
    title: 'Choose the Vault that fits',
    description:
      'Pick the Vault that best matches your location and experience level. You can hold more than one active Vault if your search covers several areas.',
  },
  {
    index: '03',
    title: 'Subscribe and unlock access',
    description:
      'Select a 1, 3 or 6-month plan. Once active, sign in to view the full subscriber details inside your chosen Vault.',
  },
];

const afterPreview = [
  'No need to return to this page',
  'Preview → Vaults → Subscribe → Sign in',
  'Full access remains on the Gravitas Edge website',
];

function CheckItem({ className = 'h-4 w-4' }: { className?: string }) {
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

export default function HowItWorksPage() {
  return (
    <div className="overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — DARK NAVY INTRO                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#061B36]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
          <Eyebrow invert>HOW GRAVITAS EDGE WORKS</Eyebrow>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
            See what is available. Decide what is relevant. Subscribe only when it makes sense.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            The process is intentionally simple. Base your decision on the jobs you can actually see
            in the live preview — not just the name of a Vault or a promise of what may be inside.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — THREE STEP PROCESS                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <InfoCard key={step.index} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — WHY THE PREVIEW MATTERS                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-white dark:bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl bg-[#061B36] p-7 sm:p-9">
              <Eyebrow invert>WHY THE PREVIEW MATTERS</Eyebrow>
              <h2 className="mt-4 max-w-md text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
                We want you to decide after seeing the opportunities, not on guesswork.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
                The Free Preview shows the current jobs available on the platform. Review it first.
                If they fit your search, continue to the Vaults and choose your access. If they do
                not add value right now, there is no reason to subscribe yet.
              </p>
              <div className="mt-8">
                <Link
                  href="/opportunities"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061B36] sm:text-base"
                >
                  Open the Live Free Preview
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-line bg-white p-7 card-static dark:bg-surface-elevated sm:p-9">
              <h2 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
                What happens after the preview?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-content-muted sm:text-base">
                From the preview, continue directly to Vaults &amp; Plans. There you can compare the
                Vaults, see who each one is for and select the access period that suits you.
              </p>
              <ul className="mt-7 space-y-3 border-t border-line pt-6">
                {afterPreview.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-content">
                    <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                      <CheckItem className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
