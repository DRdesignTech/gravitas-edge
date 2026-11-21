'use client';

import { useMemo, useState } from 'react';
import ReferAndEarnCta from './ReferAndEarnCta';

const PLAN_PRESETS = [
  { label: 'Standard Vault', price: 2999 },
  { label: 'Professional Vault', price: 5999 },
  { label: 'Executive Premier', price: 9999 },
];

export default function ReferralCalculator() {
  const [referralCount, setReferralCount] = useState<number>(8);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(5999);

  const { tierName, commissionRate, totalEarnings, nextTierInfo, progressPercent } =
    useMemo(() => {
      let rate = 0.1;
      let name = 'Tier 1 (10%)';
      let next = '2 more referrals to reach Tier 2 (15%)';
      let progress = (referralCount / 5) * 50;

      if (referralCount >= 11) {
        rate = 0.2;
        name = 'Tier 3 (20% — Top Tier 👑)';
        next = 'Maximum top tier active! 20% on all future referrals.';
        progress = 100;
      } else if (referralCount >= 6) {
        rate = 0.15;
        name = 'Tier 2 (15%)';
        const needed = 11 - referralCount;
        next = `${needed} more referral${needed === 1 ? '' : 's'} to unlock VIP Tier 3 (20%)`;
        progress = 50 + ((referralCount - 5) / 5) * 50;
      }

      const earnings = Math.round(referralCount * selectedPlanPrice * rate);

      return {
        tierName: name,
        commissionRate: Math.round(rate * 100),
        totalEarnings: earnings,
        nextTierInfo: next,
        progressPercent: Math.min(100, Math.max(10, progress)),
      };
    }, [referralCount, selectedPlanPrice]);

  return (
    <div
      id="calculator"
      className="rounded-3xl border border-[#E9E5DC] bg-white p-6 sm:p-8 lg:p-10 shadow-xl dark:border-[#1E3557] dark:bg-[#0A1E38] text-[#061B36] dark:text-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E9E5DC] pb-6 dark:border-[#1E3557]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D6952F]/15 px-3 py-1 text-xs font-bold text-[#D6952F]">
            ⚡ INTERACTIVE EARNINGS ESTIMATOR
          </span>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight">
            Calculate Your Referral Income
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400">
            Simulate your wallet earnings based on your network size and preferred vault subscription tier.
          </p>
        </div>
        <div className="rounded-2xl border border-[#D6952F]/30 bg-[#FAF8F5] px-4 py-2.5 dark:bg-[#081B33] text-right">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#5B6479] dark:text-slate-400">
            Current Tier
          </span>
          <span className="text-sm font-bold text-[#D6952F]">{tierName}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 items-center">
        {/* Controls Column (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Slider: Number of referrals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="referral-range"
                className="text-xs font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-300"
              >
                Number of Colleague Referrals
              </label>
              <span className="inline-flex items-center rounded-lg bg-[#061B36] px-3 py-1 text-sm font-bold text-white dark:bg-[#1D3B66]">
                {referralCount} {referralCount === 1 ? 'person' : 'people'}
              </span>
            </div>
            <input
              id="referral-range"
              type="range"
              min="1"
              max="50"
              value={referralCount}
              onChange={(e) => setReferralCount(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E9E5DC] accent-[#D6952F] dark:bg-[#1E3557]"
            />
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#8C9AC0]">
              <span>1 Referral</span>
              <span>10 Referrals</span>
              <span>25 Referrals</span>
              <span>50+ Referrals</span>
            </div>
          </div>

          {/* Plan price select */}
          <div>
            <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-300">
              Average Vault Plan Subscribed
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PLAN_PRESETS.map((p) => {
                const isSelected = selectedPlanPrice === p.price;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setSelectedPlanPrice(p.price)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#D6952F] bg-[#FAF8F5] dark:bg-[#081B33] ring-1 ring-[#D6952F]'
                        : 'border-[#E9E5DC] hover:border-[#D6952F]/50 dark:border-[#1E3557] dark:hover:border-[#D6952F]/40'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-[#5B6479] dark:text-slate-300">
                      {p.label}
                    </span>
                    <span className="mt-1 block text-sm font-extrabold text-[#061B36] dark:text-white">
                      ₹{p.price.toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier progression indicator */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]">
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span className="font-bold text-[#061B36] dark:text-white">Tier Progression</span>
              <span className="text-[#D6952F] font-semibold">{nextTierInfo}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E9E5DC] dark:bg-[#1E3557]">
              <div
                className="h-full bg-gradient-to-r from-[#D6952F] to-[#F0C27B] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Results Card Column (5 cols) */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl border border-[#D6952F]/40 bg-gradient-to-b from-[#061B36] to-[#0A2645] p-6 sm:p-7 text-white shadow-xl isolate">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#D6952F]/20 blur-2xl"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-[#F0C27B]">
              Estimated Wallet Credit
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-[#C9D3EA]">
                ({commissionRate}% rate)
              </span>
            </div>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-[#C9D3EA]">
              <div className="flex items-center justify-between">
                <span>Total referred:</span>
                <strong className="text-white">{referralCount} subscribers</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Commission tier:</span>
                <strong className="text-[#F0C27B]">{commissionRate}% per subscription</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Withdrawal threshold:</span>
                <strong className="text-white">₹1,000 (Reached ✓)</strong>
              </div>
            </div>

            <div className="mt-6">
              <ReferAndEarnCta label="Get Your Referral Link" className="w-full text-center" />
            </div>

            <p className="mt-3 text-[11px] text-center text-[#8C9AC0]">
              Instant credit upon subscription · Direct bank withdrawal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
