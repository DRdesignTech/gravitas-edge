import React from 'react';

export default function ReferralWalletGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Outer Glow Effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 rounded-full bg-[#D6952F]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 rounded-full bg-[#15803D]/15 blur-3xl"
      />

      {/* Main Luxury Digital Partner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D6952F]/40 bg-gradient-to-br from-[#061B36] via-[#092244] to-[#0A2645] p-6 sm:p-7 shadow-2xl text-white isolate">
        {/* Card Watermark Rings */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border border-white/5 opacity-50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/5 opacity-30"
        />

        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D6952F]/20 border border-[#D6952F]/40 text-[#F0C27B]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#D6952F]">
                Partner Wallet
              </p>
              <p className="text-xs font-semibold text-white">Gravitas Edge Network</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Partner
          </span>
        </div>

        {/* Card Chip & Balance */}
        <div className="mt-8">
          <p className="text-xs font-medium text-[#AEB9D6]">Available Wallet Balance</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              ₹8,450.00
            </span>
            <span className="text-xs font-semibold text-[#D6952F]">INR</span>
          </div>
        </div>

        {/* Live Transaction / Credit Notification */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#AEB9D6]">Latest Credit (Tier 3 · 20%)</span>
            <span className="font-bold text-emerald-400">+₹1,199.80</span>
          </div>
          <p className="mt-1 text-[11px] text-[#8C9AC0] truncate">
            Executive Premier Vault Referral · Credited
          </p>
        </div>

        {/* Minimum Threshold Progress */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span className="text-[#AEB9D6]">Redemption Threshold</span>
            <span className="font-bold text-white">₹1,000 (Ready to Withdraw)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-[#D6952F] rounded-full" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8C9AC0]">
            <span>Method: Bank Transfer / UPI</span>
            <span className="text-[#F0C27B] font-semibold">Instant Payout Request</span>
          </div>
        </div>
      </div>
    </div>
  );
}
