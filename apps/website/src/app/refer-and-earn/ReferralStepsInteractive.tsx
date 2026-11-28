'use client';

import { useState, type MouseEvent } from 'react';
import ScrollReveal from '@/components/marketing/ScrollReveal';

export interface ReferralStepItem {
  number: string;
  title: string;
  description: string;
}

function StepIcon({ number, active }: { number: string; active: boolean }) {
  const cls = `h-5 w-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`;
  switch (number) {
    case '01':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      );
    case '02':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      );
    case '03':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

const STEP_TAGS = ['Generate', 'Distribute', 'Verify', 'Withdraw'] as const;

const SHARE_CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    preview:
      'Hey! Check out Gravitas Edge for direct corporate vendor & RFP mandates — use my invite link for instant onboarding.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    preview:
      'Connecting recruitment partners directly with funded corporate procurement teams. Join Gravitas Edge via my referral link.',
  },
  {
    id: 'email',
    label: 'Email',
    preview:
      'Subject: Direct Corporate Vendor Access — Here is my personal Gravitas Edge partner invitation link.',
  },
] as const;

const DEMO_PLANS = [
  { label: 'Monthly', price: 3999 },
  { label: '3 Months', price: 10999 },
  { label: '6 Months', price: 19999 },
] as const;

function StepInteractiveCard({
  step,
  index,
  isActive,
  isCompleted,
  onSelect,
}: {
  step: ReferralStepItem;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onSelect: () => void;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  function handleMouseMove(e: MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 8,
      ry: (px - 0.5) * 8,
      gx: px * 100,
      gy: py * 100,
      hovered: true,
    });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });
  }

  return (
    <ScrollReveal delay={index * 80} className="h-full">
      <div style={{ perspective: '1000px' }} className="h-full">
        <button
          type="button"
          onClick={onSelect}
          onMouseEnter={() => setTilt((prev) => ({ ...prev, hovered: true }))}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-pressed={isActive}
          style={{
            transform: tilt.hovered
              ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-4px)`
              : isActive
                ? 'translateY(-3px)'
                : 'translateY(0px)',
            transformStyle: 'preserve-3d',
            transition: tilt.hovered
              ? 'transform 0.14s ease-out, box-shadow 0.25s ease, border-color 0.25s ease'
              : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease',
          }}
          className={`group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6952F] ${
            isActive
              ? 'border-[#D6952F] bg-gradient-to-br from-[#061B36] via-[#0A2547] to-[#0E2F5A] text-white shadow-[0_22px_45px_-18px_rgba(6,27,54,0.65)]'
              : 'border-[#E9E5DC] bg-white text-[#061B36] shadow-sm hover:border-[#D6952F]/60 hover:shadow-md dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white'
          }`}
        >
          {/* Cursor spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: tilt.hovered ? 1 : 0,
              background: isActive
                ? `radial-gradient(240px circle at ${tilt.gx}% ${tilt.gy}%, rgba(240, 194, 123, 0.18), transparent 70%)`
                : `radial-gradient(240px circle at ${tilt.gx}% ${tilt.gy}%, rgba(214, 149, 47, 0.12), transparent 70%)`,
            }}
          />

          {/* Top accent bar */}
          <div
            className={`absolute inset-x-0 top-0 h-1 transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-r from-[#D6952F] via-[#F0C27B] to-[#D6952F]'
                : isCompleted
                  ? 'bg-[#10B981]/70'
                  : 'bg-transparent group-hover:bg-[#D6952F]/40'
            }`}
          />

          {/* Oversized subtle watermark number */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute -right-2 -top-3 select-none text-7xl font-black tracking-tighter transition-colors duration-300 ${
              isActive
                ? 'text-white/[0.06]'
                : 'text-[#061B36]/[0.04] dark:text-white/[0.04]'
            }`}
          >
            {step.number}
          </span>

          <div className="relative z-10">
            {/* Step badge + Icon */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-[#D6952F] text-[#061B36]'
                    : isCompleted
                      ? 'bg-[#10B981]/15 text-[#059669] dark:text-[#34D399]'
                      : 'bg-[#FAF8F5] text-[#5B6479] group-hover:bg-[#D6952F]/15 group-hover:text-[#061B36] dark:bg-[#081B33] dark:text-slate-300 dark:group-hover:text-white'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? 'bg-[#061B36]'
                      : isCompleted
                        ? 'bg-[#10B981]'
                        : 'bg-[#D6952F]'
                  }`}
                />
                {STEP_TAGS[index] ?? `Step ${step.number}`}
              </span>

              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-white/10 text-[#F0C27B] ring-1 ring-[#F0C27B]/40'
                    : 'bg-[#FAF8F5] text-[#D6952F] group-hover:bg-[#D6952F]/15 dark:bg-[#081B33]'
                }`}
              >
                <StepIcon number={step.number} active={isActive} />
              </span>
            </div>

            <h3
              className={`mt-5 text-base font-extrabold leading-snug ${
                isActive ? 'text-white' : 'text-[#061B36] dark:text-white'
              }`}
            >
              {step.title}
            </h3>

            <p
              className={`mt-2 text-xs leading-relaxed ${
                isActive ? 'text-[#C9D3EA]' : 'text-[#5B6479] dark:text-slate-400'
              }`}
            >
              {step.description}
            </p>
          </div>

          {/* Interactive footer */}
          <div
            className={`relative z-10 mt-6 flex items-center justify-between border-t pt-4 ${
              isActive ? 'border-white/15' : 'border-[#E9E5DC] dark:border-[#1E3557]'
            }`}
          >
            <span
              className={`text-[11px] font-bold tracking-wide ${
                isActive ? 'text-[#F0C27B]' : 'text-[#8C9AC0]'
              }`}
            >
              STEP {step.number} / 04
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold transition-transform duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-[#D6952F] group-hover:translate-x-0.5'
              }`}
            >
              {isActive ? 'Active' : 'Explore'}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </button>
      </div>
    </ScrollReveal>
  );
}

export default function ReferralStepsInteractive({
  steps,
}: {
  steps: ReferralStepItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedSample, setCopiedSample] = useState(false);
  const [channelIdx, setChannelIdx] = useState(0);
  const [planIdx, setPlanIdx] = useState(1);
  const [ratePercent, setRatePercent] = useState<10 | 15 | 20>(15);

  const activeStep = steps[activeIndex] ?? steps[0];
  const progressPercent = ((activeIndex + 1) / steps.length) * 100;
  const selectedPlan = DEMO_PLANS[planIdx] ?? DEMO_PLANS[1];
  const sampleCommission = Math.round((selectedPlan.price * ratePercent) / 100);

  function handleCopySample() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://gravitas.edge/r/PARTNER-2026').catch(() => {});
    }
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 1800);
  }

  return (
    <div className="mt-10">
      {/* Connected Journey Progress Rail */}
      <div className="mb-7 hidden items-center justify-between gap-4 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] px-5 py-3.5 lg:flex dark:border-[#1E3557] dark:bg-[#081B33]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#061B36] dark:text-white">
            Partner Journey
          </span>
          <span className="rounded-full bg-[#D6952F]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#B37517] dark:text-[#F0C27B]">
            Click any card below
          </span>
        </div>

        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9E5DC] dark:bg-[#1E3557]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D6952F] to-[#F0C27B] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs font-extrabold text-[#061B36] dark:text-[#F0C27B]">
            {activeIndex + 1} of {steps.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="rounded-xl border border-[#E9E5DC] bg-white px-3 py-1.5 text-xs font-bold text-[#061B36] transition hover:border-[#D6952F] disabled:opacity-40 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev + 1) % steps.length)}
            className="rounded-xl bg-[#061B36] px-3 py-1.5 text-xs font-bold text-[#F0C27B] transition hover:bg-[#0D2B52] dark:bg-[#D6952F] dark:text-[#061B36]"
          >
            {activeIndex === steps.length - 1 ? 'Restart' : 'Next Step →'}
          </button>
        </div>
      </div>

      {/* 4 Interactive Step Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, idx) => (
          <StepInteractiveCard
            key={step.number}
            step={step}
            index={idx}
            isActive={idx === activeIndex}
            isCompleted={idx < activeIndex}
            onSelect={() => setActiveIndex(idx)}
          />
        ))}
      </div>

      {/* Live Step Preview Console */}
      <div className="mt-6 rounded-3xl border border-[#E9E5DC] bg-[#FAF8F5] p-5 sm:p-6 dark:border-[#1E3557] dark:bg-[#081B33]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 items-center rounded-lg bg-[#061B36] px-2.5 text-xs font-extrabold text-[#F0C27B]">
                STEP {activeStep.number}
              </span>
              <span className="text-sm font-extrabold text-[#061B36] dark:text-white">
                {activeStep.title} — Live Preview
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#5B6479] dark:text-slate-400">
              {activeStep.description}
            </p>
          </div>

          {/* Step-specific interactive widget */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeIndex === 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E9E5DC] bg-white p-2 dark:border-[#1E3557] dark:bg-[#0E2340]">
                <code className="px-2.5 text-xs font-semibold text-[#061B36] dark:text-[#F0C27B]">
                  gravitas.edge/r/PARTNER-2026
                </code>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="rounded-xl bg-[#061B36] px-3.5 py-2 text-xs font-bold text-[#F0C27B] transition hover:bg-[#0D2B52]"
                >
                  {copiedSample ? 'Copied ✓' : 'Copy Sample Link'}
                </button>
              </div>
            )}

            {activeIndex === 1 && (
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-wrap gap-1.5">
                  {SHARE_CHANNELS.map((ch, i) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChannelIdx(i)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        channelIdx === i
                          ? 'bg-[#061B36] text-[#F0C27B]'
                          : 'border border-[#E9E5DC] bg-white text-[#5B6479] hover:border-[#D6952F] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-300'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
                <p className="max-w-md rounded-xl border border-[#E9E5DC] bg-white px-3 py-2 text-[11px] text-[#5B6479] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-300">
                  “{SHARE_CHANNELS[channelIdx]?.preview}”
                </p>
              </div>
            )}

            {activeIndex === 2 && (
              <div className="flex flex-wrap items-center gap-2">
                {DEMO_PLANS.map((plan, i) => (
                  <button
                    key={plan.label}
                    type="button"
                    onClick={() => setPlanIdx(i)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                      planIdx === i
                        ? 'bg-[#061B36] text-[#F0C27B] shadow-sm'
                        : 'border border-[#E9E5DC] bg-white text-[#061B36] hover:border-[#D6952F] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white'
                    }`}
                  >
                    {plan.label} · ₹{plan.price.toLocaleString('en-IN')}
                  </button>
                ))}
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#10B981]/15 px-3 py-2 text-xs font-bold text-[#059669] dark:text-[#34D399]">
                  Referral Confirmed ✓
                </span>
              </div>
            )}

            {activeIndex === 3 && (
              <div className="flex flex-wrap items-center gap-2">
                {([10, 15, 20] as const).map((tierRate) => (
                  <button
                    key={tierRate}
                    type="button"
                    onClick={() => setRatePercent(tierRate)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      ratePercent === tierRate
                        ? 'bg-[#D6952F] text-[#061B36]'
                        : 'border border-[#E9E5DC] bg-white text-[#5B6479] hover:border-[#D6952F] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-300'
                    }`}
                  >
                    {tierRate}% Tier
                  </button>
                ))}
                <div className="rounded-xl border border-[#D6952F]/40 bg-white px-3.5 py-2 text-xs font-extrabold text-[#061B36] dark:bg-[#0E2340] dark:text-white">
                  Wallet Credit: <span className="text-[#059669] dark:text-[#34D399]">+₹{sampleCommission.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
