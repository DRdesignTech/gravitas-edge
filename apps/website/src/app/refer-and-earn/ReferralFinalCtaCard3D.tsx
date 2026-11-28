'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import ScrollReveal from '@/components/marketing/ScrollReveal';
import ReferAndEarnCta from './ReferAndEarnCta';

function CheckMiniIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[#F0C27B]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ReferralFinalCtaCard3D() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 7,
      ry: (px - 0.5) * 7,
      gx: px * 100,
      gy: py * 100,
      hovered: true,
    });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });
  }

  return (
    <ScrollReveal direction="scale">
      <div style={{ perspective: '1100px' }} className="w-full">
        <div
          onMouseEnter={() => setTilt((prev) => ({ ...prev, hovered: true }))}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transformStyle: 'preserve-3d',
            transform: tilt.hovered
              ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-5px)`
              : 'rotateX(0deg) rotateY(0deg) translateY(0px)',
            transition: tilt.hovered
              ? 'transform 120ms ease-out, box-shadow 300ms, border-color 300ms'
              : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms, border-color 300ms',
          }}
          className="group relative isolate overflow-hidden rounded-3xl border border-[#D6952F]/45 bg-gradient-to-br from-[#061B36] via-[#092244] to-[#0B2A4F] px-6 py-7 sm:px-10 sm:py-8 lg:px-12 lg:py-9 text-center text-white shadow-[0_24px_54px_-20px_rgba(6,27,54,0.65)] hover:border-[#F0C27B]/75 hover:shadow-[0_32px_68px_-20px_rgba(6,27,54,0.75)]"
        >
          {/* Cursor-following gold spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
            style={{
              opacity: tilt.hovered ? 1 : 0,
              background: `radial-gradient(360px circle at ${tilt.gx}% ${tilt.gy}%, rgba(240, 194, 123, 0.2), transparent 70%)`,
            }}
          />

          {/* Diagonal sheen sweep on hover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100"
          />

          {/* Top gold shimmer edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#F0C27B] to-transparent opacity-55 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Ambient corner glows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#15803D]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -bottom-16 h-52 w-52 rounded-full bg-[#D6952F]/20 blur-3xl"
          />

          <div className="relative z-10 mx-auto max-w-2xl" style={{ transformStyle: 'preserve-3d' }}>
            {/* Eyebrow Pill */}
            <div style={{ transform: 'translateZ(20px)' }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/40 bg-[#D6952F]/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#F0C27B] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F] animate-pulse" />
                READY TO GET STARTED?
              </span>
            </div>

            {/* Headline */}
            <h2
              className="mt-4 font-sans text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl leading-tight text-white"
              style={{ transform: 'translateZ(26px)' }}
            >
              Start Earning From{' '}
              <span className="text-[#F0C27B]">Your Network Today</span>
            </h2>

            {/* Subtitle */}
            <p
              className="mx-auto mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-[#C9D3EA]"
              style={{ transform: 'translateZ(16px)' }}
            >
              Share your unique link, invite colleagues, and watch rewards accumulate in your
              Gravitas Edge partner wallet — redeemable to your bank anytime.
            </p>

            {/* Dual Action Buttons */}
            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
              style={{ transform: 'translateZ(24px)' }}
            >
              <ReferAndEarnCta label="Get Your Referral Link" size="md" variant="gold" />
              <Link
                href="/referral-terms"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-xs transition-all hover:bg-white/10 hover:border-white/35 hover:-translate-y-0.5"
              >
                Review Terms &amp; Policies →
              </Link>
            </div>

            {/* Compact Feature Checklist Strip */}
            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-[#AEB9D6]"
              style={{ transform: 'translateZ(14px)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckMiniIcon />
                Takes under 1 min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckMiniIcon />
                Instant unique link
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckMiniIcon />
                No subscription needed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckMiniIcon />
                ₹1,000 bank payout
              </span>
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
