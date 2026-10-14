import type { Metadata } from 'next';
import Link from 'next/link';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import ReferAndEarnCta from './ReferAndEarnCta';

export const metadata: Metadata = {
  title: 'Refer & Earn — Gravitas Edge Consulting',
  description:
    'Invite professionals in your network to Gravitas Edge. When they subscribe, you earn rewards in your Gravitas Edge wallet — 10%, 15% or 20% based on your referrals.',
  openGraph: {
    title: 'Refer & Earn — Gravitas Edge Consulting',
    description:
      'Share opportunities with your network and earn rewards in your Gravitas Edge wallet. Earn 10%, 15% or 20% based on your referrals.',
  },
};

/**
 * Referral reward tiers.
 *
 * IMPORTANT: These percentages and thresholds are client-provided display
 * content (they match the published Referral Programme Terms). They DO NOT
 * currently match the active ReferralSlab rows configured in the backend
 * (which are seeded as 5% / 10% / 15% / 20% for 1-5 / 6-10 / 11-20 / 21+).
 * This discrepancy is reported and left untouched - no reward logic is
 * calculated or changed here.
 */
const REWARD_TIERS = [
  { rate: '10%', range: '1–5 referrals', tier: 'Tier 1', accent: false },
  { rate: '15%', range: '6–10 referrals', tier: 'Tier 2', accent: false },
  { rate: '20%', range: '11+ referrals', tier: 'Tier 3', accent: true },
];

const STEPS = [
  {
    title: 'Copy your unique referral link',
    icon: (
      <>
        <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757" />
        <path d="M10.81 15.312a4.5 4.5 0 01-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
      </>
    ),
  },
  {
    title: 'Share with your network',
    icon: (
      <>
        <circle cx="18" cy="5" r="2.75" />
        <circle cx="6" cy="12" r="2.75" />
        <circle cx="18" cy="19" r="2.75" />
        <path d="M8.6 10.6l6.8-3.7M8.6 13.4l6.8 3.7" />
      </>
    ),
  },
  {
    title: 'They subscribe to any plan',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
  },
  {
    title: 'You earn rewards in your wallet',
    icon: (
      <>
        <path d="M3.5 8.5A2.5 2.5 0 016 6h11.5a2.5 2.5 0 012.5 2.5v8A2.5 2.5 0 0117.5 19H6a2.5 2.5 0 01-2.5-2.5v-8Z" />
        <path d="M16 12.75h.008v.008H16v-.008Z" />
        <path d="M3.5 9.5h13A2.5 2.5 0 0119 12v0a2.5 2.5 0 01-2.5 2.5h-13" />
      </>
    ),
  },
];

const NOTICE_POINTS = [
  'Rewards are applicable only on successful paid subscriptions.',
  'Use your unique referral link or code.',
];

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
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

function GiftIllustration() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-[2rem] border border-[#C8943E]/20 bg-gradient-to-br from-[#FFF3D9] to-[#FDEBC6] dark:from-brand-950 dark:to-[#0B1B33]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full bg-[#C8943E]/15 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-6 h-32 w-32 rounded-full bg-[#061B36]/10 blur-3xl dark:bg-[#C8943E]/10"
      />
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#E3B968] to-[#C8943E] shadow-[0_22px_55px_-25px_rgba(200,148,62,0.85)] sm:h-40 sm:w-40">
        <svg
          className="h-16 w-16 text-[#061B36] sm:h-20 sm:w-20"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
    </div>
  );
}

export default function ReferAndEarnPage() {
  return (
    <div className="overflow-x-clip">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HERO                                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#061B36]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(80% 90% at 20% 0%, rgba(200,148,62,0.22) 0%, rgba(200,148,62,0) 60%), radial-gradient(70% 80% at 100% 100%, rgba(227,185,104,0.14) 0%, rgba(227,185,104,0) 55%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
          <Eyebrow invert>REFER &amp; EARN</Eyebrow>
          <h1 className="mt-5 font-serif-heading text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Share Opportunities.
            <span className="block text-[#C8943E]">Earn Rewards.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Invite professionals in your network to Gravitas Edge. When they subscribe, you earn
            rewards in your Gravitas Edge wallet.
          </p>
          <div className="mt-9 flex justify-center">
            <ReferAndEarnCta />
          </div>
          <p className="mt-4 text-xs text-slate-400 sm:text-sm">
            Earn more as you refer more — up to 20% per successful referral.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* REWARD TIERS                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="section-glow relative bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>OUR REFERRAL REWARD TIERS</Eyebrow>
            <h2 className="mt-4 font-serif-heading text-3xl font-bold tracking-tight text-content sm:text-4xl">
              The more you refer, the more you earn.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-content-muted">
              Rewards are calculated as a percentage of every successful paid subscription made
              through your referral.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {REWARD_TIERS.map((tier) => (
              <div
                key={tier.rate}
                className={`card-static relative flex flex-col items-center overflow-hidden rounded-2xl p-7 text-center ${
                  tier.accent ? 'ring-2 ring-[#C8943E]/60' : ''
                }`}
              >
                {tier.accent && (
                  <span className="absolute right-4 top-4 rounded-full bg-gradient-to-br from-[#E3B968] to-[#C8943E] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#061B36]">
                    Top tier
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C8943E]">
                  {tier.tier}
                </span>
                <span className="mt-4 font-serif-heading text-5xl font-extrabold tracking-tight text-[#061B36] dark:text-[#E3B968]">
                  {tier.rate}
                </span>
                <span className="mt-3 text-sm font-medium text-content-muted">{tier.range}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#061B36]/5 px-3 py-1 text-xs font-medium text-[#061B36] dark:bg-white/10 dark:text-slate-200">
                  <CheckIcon className="h-3.5 w-3.5 text-[#C8943E]" />
                  Per successful referral
                </span>
              </div>
            ))}
          </div>

          <InfoBanner align="center" className="mt-8">
            From 11 referrals onwards, you continue to earn 20% on every additional referral. No
            upper limit on the number of referrals.
          </InfoBanner>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="section-glow-navy relative border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2 className="mt-4 font-serif-heading text-3xl font-bold tracking-tight text-content sm:text-4xl">
              Four simple steps.
            </h2>
          </div>

          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative flex h-full flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center card-static dark:bg-surface-elevated"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#C8943E] bg-brand-600 font-serif-heading text-xl font-bold text-white shadow-[0_12px_28px_-12px_rgba(6,27,54,0.65)]">
                  {i + 1}
                </span>
                <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-[#C8943E] ring-1 ring-inset ring-[#C8943E]/15 dark:from-brand-950 dark:to-brand-900">
                  <StepIcon>{step.icon}</StepIcon>
                </span>
                <p className="mt-4 text-sm font-semibold leading-snug text-content">{step.title}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* YOUR REWARDS                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <GiftIllustration />
            <div className="text-center lg:text-left">
              <Eyebrow>YOUR REWARDS</Eyebrow>
              <h2 className="mt-4 font-serif-heading text-3xl font-bold tracking-tight text-content sm:text-4xl">
                Rewards land in your wallet.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-content-muted">
                Rewards are added to your Gravitas Edge wallet. Redeem once you reach ₹1,000.
              </p>
              <ul className="mt-6 space-y-3 text-left">
                {[
                  'Every successful paid subscription adds a reward to your wallet.',
                  'Track your earnings and referral history from your dashboard.',
                  'Redeem in one place once you reach the minimum amount.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-content">
                    <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex justify-center lg:justify-start">
                <Link
                  href="/referral-terms"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#C8943E]/50 bg-surface px-6 py-3 text-sm font-semibold text-[#061B36] transition-colors hover:bg-[#FFF3D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 dark:text-[#E3B968] dark:hover:bg-brand-950"
                >
                  Learn More
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* IMPORTANT NOTICE + FINAL CTA                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="rounded-2xl border border-line bg-surface p-6 card-static dark:bg-surface-elevated sm:p-8">
            <h2 className="font-serif-heading text-xl font-bold tracking-tight text-content">
              Important
            </h2>
            <ul className="mt-5 space-y-3">
              {NOTICE_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-content-muted">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8943E]" />
                  {point}
                </li>
              ))}
              <li className="flex items-start gap-3 text-sm leading-relaxed text-content-muted">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8943E]" />
                <span>
                  Detailed terms and conditions are available{' '}
                  <Link
                    href="/referral-terms"
                    className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                  >
                    here
                  </Link>
                  .
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-12 text-center">
            <h2 className="font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
              Ready to start earning?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-content-muted sm:text-base">
              Share your unique link, invite your network, and watch your rewards grow in your
              Gravitas Edge wallet.
            </p>
            <div className="mt-8 flex justify-center">
              <ReferAndEarnCta />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
