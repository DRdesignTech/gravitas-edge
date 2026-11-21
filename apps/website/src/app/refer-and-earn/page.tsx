import type { Metadata } from 'next';
import Link from 'next/link';
import ReferAndEarnCta from './ReferAndEarnCta';
import ReferralCalculator from './ReferralCalculator';
import ReferralWalletGraphic from './ReferralWalletGraphic';

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
 * Matches published Referral Programme Terms:
 * Tier 1: 10% (1–5 referrals)
 * Tier 2: 15% (6–10 referrals)
 * Tier 3: 20% (11+ referrals)
 */
const REWARD_TIERS = [
  {
    tier: 'Tier 1',
    label: 'Starter Tier',
    rate: '10%',
    range: '1–5 referrals',
    description: 'Immediate reward activation upon your first referred paid subscription.',
    accent: false,
    perks: [
      '10% direct wallet credit',
      'Trackable personal referral link',
      'Real-time dashboard analytics',
    ],
  },
  {
    tier: 'Tier 2',
    label: 'Growth Tier',
    rate: '15%',
    range: '6–10 referrals',
    description: '1.5x commission multiplier automatically unlocked on your 6th referral.',
    accent: false,
    perks: [
      '15% direct wallet credit',
      'Accelerated wallet growth',
      'Priority payout processing',
    ],
  },
  {
    tier: 'Tier 3',
    label: 'VIP Top Tier',
    rate: '20%',
    range: '11+ referrals',
    description: 'Maximum top-tier rate retained indefinitely on all subsequent referrals.',
    accent: true,
    perks: [
      'Maximum 20% wallet payout',
      'Permanent VIP rate status',
      'Zero upper cap on total earnings',
    ],
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Get Your Unique Link',
    description: 'Sign in to access your unique referral link and personalized tracking code from your dashboard.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Share With Your Network',
    description: 'Send your link to colleagues, peers, or professional communities via WhatsApp, LinkedIn, or Email.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'They Subscribe to a Plan',
    description: 'When your invited contact purchases any Gravitas Edge opportunity vault or plan, the referral is confirmed.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Earn Instant Cash Rewards',
    description: 'Earn 10% to 20% commission directly credited into your wallet, redeemable via bank transfer once you reach ₹1,000.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const PROGRAM_HIGHLIGHTS = [
  'Rewards apply to every successful paid opportunity vault subscription.',
  'Your unique link tracks clicks, sign-ups, and subscriptions with cookie attribution.',
  'Earnings accumulate continuously in your Gravitas Edge digital wallet.',
  'Direct NEFT / UPI bank redemption available once your balance reaches ₹1,000.',
];

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

export default function ReferAndEarnPage() {
  return (
    <div className="min-h-screen bg-[#FEFDF9] text-[#1A2236] dark:bg-[#06142A] dark:text-[#EAEFFB] overflow-x-clip">
      {/* ─────────────────────────────────────────────────────────────
          1. EXECUTIVE HERO SECTION (WITH ATMOSPHERIC BACKGROUND IMAGE)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#061B36] pb-16 pt-14 text-white isolate sm:pb-20 sm:pt-16">
        {/* Background Image Layer (matching .hero::before from redesign HTML) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[-2] bg-cover bg-no-repeat [background-position:center_right] opacity-75 sm:opacity-85"
          style={{
            backgroundImage: 'url(/images/refer_earn_hero_bg.jpg)',
          }}
        />

        {/* Gradient Scrims (matching .hero::after for perfect contrast) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[-1] hidden min-[901px]:block"
          style={{
            background:
              'linear-gradient(90deg, #061B36 0%, #061B36 38%, rgba(6,27,54,0.85) 55%, rgba(6,27,54,0.3) 80%, rgba(6,27,54,0.6) 100%), linear-gradient(0deg, #061B36 0%, rgba(6,27,54,0.35) 40%, rgba(6,27,54,0) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[-1] min-[901px]:hidden block"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,27,54,0.95), rgba(6,27,54,0.75)), linear-gradient(0deg, #061B36 0%, rgba(6,27,54,0.4) 50%, rgba(6,27,54,0) 100%)',
          }}
        />

        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/20 blur-3xl z-[-1]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-0 h-80 w-80 rounded-full bg-[#D6952F]/15 blur-3xl z-[-1]"
        />

        <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-4 flex items-center gap-1.5 text-xs text-[#AEB9D6]">
            <Link href="/" className="text-[#F0C27B] hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-[#8C9AC0]">/</span>
            <span className="text-white">Refer &amp; Earn</span>
          </div>

          <div className="max-w-2xl lg:max-w-3xl">
            {/* Pill Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/40 bg-[#D6952F]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F0C27B]">
              ✨ PARTNER REWARDS PROGRAMME
            </span>

            {/* Heading */}
            <h1 className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.12]">
              Share Opportunities.{' '}
              <span className="text-[#F0C27B]">Earn Up to 20% Rewards.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[#C9D3EA]">
              Invite professionals and peers in your network to Gravitas Edge. When they subscribe to
              any curated opportunity vault, you earn cash rewards credited directly into your partner wallet.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ReferAndEarnCta label="Get Your Referral Link" size="lg" variant="gold" />
              <a
                href="#calculator"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/20 hover:border-white/40"
              >
                Estimate Earnings ↓
              </a>
            </div>

            <p className="mt-3 text-xs text-[#8C9AC0]">
              Instant tracking · No cap on earnings · Direct bank withdrawal available
            </p>
          </div>

          {/* 4 Trust & Benefit Badges */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-t border-white/10 pt-8">
            <div className="rounded-2xl border border-white/10 bg-[#061B36]/65 p-4 backdrop-blur-md">
              <span className="block text-2xl font-extrabold text-[#F0C27B]">Up to 20%</span>
              <span className="mt-1 block text-xs font-medium text-[#C9D3EA]">
                Tiered Commission
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#061B36]/65 p-4 backdrop-blur-md">
              <span className="block text-2xl font-extrabold text-[#F0C27B]">Instant</span>
              <span className="mt-1 block text-xs font-medium text-[#C9D3EA]">
                Wallet Allocation
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#061B36]/65 p-4 backdrop-blur-md">
              <span className="block text-2xl font-extrabold text-[#F0C27B]">₹1,000</span>
              <span className="mt-1 block text-xs font-medium text-[#C9D3EA]">
                Low Payout Threshold
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#061B36]/65 p-4 backdrop-blur-md">
              <span className="block text-2xl font-extrabold text-[#F0C27B]">Unlimited</span>
              <span className="mt-1 block text-xs font-medium text-[#C9D3EA]">
                Referral Capacity
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. REWARD TIERS SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F]">
              COMMISSION SLAB TIERS
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl text-[#061B36] dark:text-white">
              The More You Refer, The More You Earn
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-400">
              Rewards are calculated as a percentage of every successful paid subscription made
              through your referral link.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {REWARD_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white p-7 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-[#0E2340] ${
                  tier.accent
                    ? 'border-[#D6952F] shadow-lg ring-1 ring-[#D6952F]'
                    : 'border-[#E9E5DC] dark:border-[#1E3557]'
                }`}
              >
                {/* Accent Watermark Rings for Top Tier */}
                {tier.accent && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#D6952F]/10 blur-xl"
                    />
                    <span className="absolute right-5 top-5 rounded-full bg-[#D6952F] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#061B36]">
                      👑 Top Tier
                    </span>
                  </>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#D6952F]">
                      {tier.tier}
                    </span>
                    <span className="text-xs text-[#8C9AC0]">· {tier.label}</span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
                      {tier.rate}
                    </span>
                    <span className="text-xs font-semibold text-[#5B6479] dark:text-slate-400">
                      reward rate
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-bold text-[#D6952F]">{tier.range}</p>
                  <p className="mt-3 text-xs leading-relaxed text-[#5B6479] dark:text-slate-400">
                    {tier.description}
                  </p>

                  <div className="mt-6 border-t border-[#E9E5DC] dark:border-[#1E3557] pt-5">
                    <ul className="space-y-2.5">
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2 text-xs text-[#1A2236] dark:text-slate-300">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <CheckIcon className="h-3 w-3" />
                          </span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <span className="inline-flex w-full items-center justify-center rounded-xl bg-[#FAF8F5] py-2 text-xs font-semibold text-[#061B36] dark:bg-[#081B33] dark:text-slate-200">
                    Per Paid Subscriber
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Transparent slab continuity callout */}
          <div className="mt-8 rounded-2xl border border-[#D6952F]/30 bg-[#FAF8F5] p-4 text-center sm:p-5 dark:border-[#D6952F]/20 dark:bg-[#0A1E38]">
            <p className="text-xs sm:text-sm text-[#061B36] dark:text-slate-200 font-medium">
              💡 <strong>Permanent Top Tier:</strong> From 11 referrals onwards, you permanently retain
              the <strong>20% reward rate</strong> on every additional subscriber. There is no maximum earning limit.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE CALCULATOR SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24 dark:bg-[#07172B] border-y border-[#E9E5DC] dark:border-[#1E3557]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <ReferralCalculator />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. HOW IT WORKS (4 SIMPLE STEPS)
          ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F]">
              SIMPLE 4-STEP PROCESS
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl text-[#061B36] dark:text-white">
              How Partner Rewards Work
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-400">
              Four straightforward steps from generating your unique link to receiving your wallet payout.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#E9E5DC] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#D6952F]/50 hover:shadow-lg dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#061B36] text-sm font-extrabold text-[#F0C27B] shadow-sm dark:bg-[#1D3B66]">
                      {step.number}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#D6952F] group-hover:bg-[#D6952F]/10 dark:bg-[#081B33] transition-colors">
                      {step.icon}
                    </span>
                  </div>

                  <h3 className="mt-6 text-base font-bold text-[#061B36] dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5B6479] dark:text-slate-400">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-[#E9E5DC] dark:border-[#1E3557] pt-4">
                  <span className="text-[11px] font-semibold text-[#8C9AC0]">
                    Step {step.number} of 04
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. WALLET & PAYOUT TRANSPARENCY SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-16 sm:py-20 lg:py-24 dark:bg-[#07172B] border-y border-[#E9E5DC] dark:border-[#1E3557]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Visual Column: Digital Partner Wallet (5 cols) */}
            <div className="lg:col-span-5">
              <ReferralWalletGraphic />
            </div>

            {/* Content Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F]">
                  YOUR PARTNER WALLET
                </span>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl text-[#061B36] dark:text-white">
                  Effortless Tracking &amp; Direct Bank Redemptions
                </h2>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-400">
                  Every confirmed subscription immediately adds funds to your Gravitas Edge partner wallet.
                  Once your balance reaches ₹1,000, request a bank transfer or UPI withdrawal with one click.
                </p>
              </div>

              <div className="space-y-3.5">
                {[
                  'Real-time tracking of referral link clicks, registrations, and successful purchases.',
                  'Detailed earnings history with transparent commission rate breakdowns.',
                  'Low ₹1,000 minimum withdrawal threshold with zero hidden administrative fees.',
                  'Direct NEFT or UPI payout processing to your verified Indian bank account.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs sm:text-sm text-[#1A2236] dark:text-slate-300 font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <ReferAndEarnCta label="Open Your Wallet" size="md" variant="gold" />
                <Link
                  href="/referral-terms"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#061B36] dark:text-[#F0C27B] hover:underline"
                >
                  View Complete Terms &amp; Conditions →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. IMPORTANT PROGRAMME GUIDELINES & DISCLOSURES
          ───────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#E9E5DC] bg-white p-7 sm:p-10 dark:border-[#1E3557] dark:bg-[#0E2340] shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#061B36] text-white dark:bg-[#1D3B66]">
                ℹ
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#061B36] dark:text-white">
                  Program Guidelines &amp; Transparency Disclosures
                </h3>
                <p className="text-xs text-[#5B6479] dark:text-slate-400">
                  Key rules governing commission eligibility and redemption.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {PROGRAM_HIGHLIGHTS.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D6952F]" />
                  <span className="text-xs sm:text-sm leading-relaxed text-[#1A2236] dark:text-slate-300">
                    {point}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-[#8C9AC0] border-t border-[#E9E5DC] dark:border-[#1E3557] pt-4">
              Self-referrals and fraudulent accounts will result in wallet forfeiture. Detailed terms
              and conditions apply. Read the full policy{' '}
              <Link
                href="/referral-terms"
                className="font-bold text-[#D6952F] underline hover:text-[#C8842D]"
              >
                here
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. FINAL HIGH-CONVERSION CTA BANNER (FLOATING EXECUTIVE CARD)
          ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#FEFDF9] dark:bg-[#06142A]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[#D6952F]/40 bg-gradient-to-br from-[#061B36] via-[#092244] to-[#0A2645] p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl isolate">
            {/* Ambient Background Glows inside card */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/25 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-[#D6952F]/20 blur-3xl"
            />
            {/* Watermark Concentric Rings */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-28 -bottom-28 h-72 w-72 rounded-full border border-white/5 opacity-50"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full border border-white/5 opacity-50"
            />

            <div className="relative mx-auto max-w-3xl">
              {/* Eyebrow Pill */}
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/40 bg-[#D6952F]/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#F0C27B] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F] animate-pulse" />
                READY TO GET STARTED?
              </span>

              {/* Headline */}
              <h2 className="mt-5 font-sans text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-tight text-white">
                Start Earning From{' '}
                <span className="text-[#F0C27B]">Your Network Today</span>
              </h2>

              {/* Subtitle */}
              <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base lg:text-lg leading-relaxed text-[#C9D3EA]">
                Share your unique link, invite your colleagues, and watch your rewards accumulate
                in your Gravitas Edge partner wallet. Redeem directly to your bank account anytime.
              </p>

              {/* Dual Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <ReferAndEarnCta label="Get Your Referral Link" size="lg" variant="gold" />
                <Link
                  href="/referral-terms"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm sm:text-base font-semibold text-white backdrop-blur-xs transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5"
                >
                  Review Terms &amp; Policies →
                </Link>
              </div>

              {/* Feature Checklist Strip */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-6 text-xs sm:text-sm text-[#AEB9D6]">
                <span className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-[#F0C27B]" />
                  Takes under 1 minute
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-[#F0C27B]" />
                  Instant unique link
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-[#F0C27B]" />
                  No subscription needed to refer
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-[#F0C27B]" />
                  ₹1,000 direct bank payout
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
