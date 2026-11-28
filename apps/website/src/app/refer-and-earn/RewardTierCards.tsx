'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/marketing/ScrollReveal';

export interface RewardTierItem {
  tier: string;
  label: string;
  rate: string;
  range: string;
  description: string;
  accent: boolean;
  perks: string[];
}

function CheckIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.4}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function TierCard3D({ tier, index }: { tier: RewardTierItem; index: number }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });
  const isVip = tier.accent;
  const barWidth = index === 0 ? '36%' : index === 1 ? '68%' : '100%';

  return (
    <ScrollReveal delay={index * 90} className="h-full">
      <div
        className="group relative h-full select-none"
        style={{ perspective: '1100px' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          setTilt({
            rx: (0.5 - py) * 12,
            ry: (px - 0.5) * 12,
            mx: px * 100,
            my: py * 100,
            hovering: true,
          });
        }}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false })}
      >
        <div
          className={`relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-7 sm:p-8 ${
            isVip
              ? 'border-2 border-[#D6952F] bg-gradient-to-br from-[#061B36] via-[#0B264A] to-[#081C38] text-white shadow-[0_22px_50px_-18px_rgba(6,27,54,0.5)] group-hover:border-[#F0C27B] group-hover:shadow-[0_28px_60px_-15px_rgba(214,149,47,0.38)]'
              : 'border border-[#E9E5DC] bg-white text-[#1A2236] shadow-[0_12px_32px_-16px_rgba(6,27,54,0.14)] group-hover:border-[#D6952F]/60 group-hover:shadow-[0_22px_45px_-16px_rgba(6,27,54,0.22)] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white'
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${
              tilt.hovering ? 1.025 : 1
            })`,
            transition: tilt.hovering
              ? 'transform 110ms ease-out, border-color 300ms, box-shadow 300ms'
              : 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms, box-shadow 300ms',
          }}
        >
          {/* Top accent strip */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${
              isVip
                ? 'bg-gradient-to-r from-[#D6952F] via-[#F6D58A] to-[#D6952F]'
                : 'bg-gradient-to-r from-transparent via-[#D6952F]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'
            }`}
          />

          {/* Cursor-following 3D gold spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
            style={{
              opacity: tilt.hovering ? 1 : 0,
              background: isVip
                ? `radial-gradient(280px circle at ${tilt.mx}% ${tilt.my}%, rgba(240, 194, 123, 0.22), transparent 70%)`
                : `radial-gradient(260px circle at ${tilt.mx}% ${tilt.my}%, rgba(214, 149, 47, 0.14), transparent 70%)`,
            }}
          />

          <div style={{ transformStyle: 'preserve-3d' }}>
            {/* Header row */}
            <div
              className="flex items-center justify-between gap-2"
              style={{ transform: 'translateZ(20px)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    isVip ? 'text-[#F0C27B]' : 'text-[#D6952F]'
                  }`}
                >
                  {tier.tier}
                </span>
                <span className={`text-xs ${isVip ? 'text-[#9FB0CC]' : 'text-[#8C9AC0]'}`}>
                  · {tier.label}
                </span>
              </div>

              {isVip && (
                <span className="rounded-full bg-[#D6952F] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#061B36] shadow-sm">
                  👑 Top Tier
                </span>
              )}
            </div>

            {/* Big Commission Percentage */}
            <div
              className="mt-4 flex items-baseline gap-2"
              style={{ transform: 'translateZ(28px)' }}
            >
              <span
                className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                  isVip
                    ? 'bg-gradient-to-r from-[#F6D58A] via-[#F0C27B] to-[#D6952F] bg-clip-text text-transparent'
                    : 'text-[#061B36] dark:text-white'
                }`}
              >
                {tier.rate}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isVip ? 'text-[#C9D3EA]' : 'text-[#5B6479] dark:text-slate-400'
                }`}
              >
                reward rate
              </span>
            </div>

            <div className="mt-2.5" style={{ transform: 'translateZ(18px)' }}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={isVip ? 'text-[#F0C27B]' : 'text-[#D6952F]'}>{tier.range}</span>
                <span className={isVip ? 'text-[#9FB0CC]' : 'text-[#8C9AC0]'}>
                  {index === 0 ? 'Starter' : index === 1 ? '1.5× Boost' : '2× Max Rate'}
                </span>
              </div>
              <div
                className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${
                  isVip ? 'bg-white/10' : 'bg-[#061B36]/10 dark:bg-white/10'
                }`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D6952F] to-[#F6D58A] transition-all duration-500 group-hover:brightness-110"
                  style={{ width: barWidth }}
                />
              </div>
            </div>

            <p
              className={`mt-3.5 text-xs leading-relaxed ${
                isVip ? 'text-[#C9D3EA]' : 'text-[#5B6479] dark:text-slate-400'
              }`}
              style={{ transform: 'translateZ(14px)' }}
            >
              {tier.description}
            </p>

            {/* Perks */}
            <div
              className={`mt-5 border-t pt-5 ${
                isVip ? 'border-white/10' : 'border-[#E9E5DC] dark:border-[#1E3557]'
              }`}
              style={{ transform: 'translateZ(16px)' }}
            >
              <ul className="space-y-2">
                {tier.perks.map((perk) => (
                  <li
                    key={perk}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1 text-xs transition-colors ${
                      isVip
                        ? 'text-[#E2E8F5] hover:bg-white/[0.06]'
                        : 'text-[#1A2236] hover:bg-[#FAF8F5] dark:text-slate-300 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        isVip
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Pill */}
          <div className="mt-7 pt-2" style={{ transform: 'translateZ(20px)' }}>
            <span
              className={`inline-flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-colors ${
                isVip
                  ? 'bg-[#D6952F] text-[#061B36] shadow-sm group-hover:bg-[#F0C27B]'
                  : 'bg-[#FAF8F5] text-[#061B36] group-hover:bg-[#061B36] group-hover:text-[#F6D58A] dark:bg-[#081B33] dark:text-slate-200 dark:group-hover:bg-[#D6952F] dark:group-hover:text-[#061B36]'
              }`}
            >
              Per Paid Subscriber
            </span>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function RewardTierCards({ tiers }: { tiers: RewardTierItem[] }) {
  return (
    <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-3">
      {tiers.map((tier, idx) => (
        <TierCard3D key={tier.tier} tier={tier} index={idx} />
      ))}
    </div>
  );
}
