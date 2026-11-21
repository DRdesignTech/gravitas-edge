import type { ReactNode } from 'react';
import InfoBanner from './InfoBanner';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCb0FrAe5VxQRICTf2K';

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0012.04 2zm0 18.15a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.25l2.5 2.5 4.5-5" />
    </svg>
  );
}

function LayersIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

function BellIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}

function BoltIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2L4.5 13.5H11L9.5 22 19.5 10.5H13L15 2h-2z" />
    </svg>
  );
}

function MicIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function CellularIcon({ className = 'h-2.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 17 10" fill="currentColor" aria-hidden="true">
      <rect x="0" y="7" width="2.5" height="3" rx="0.5" />
      <rect x="4.5" y="5" width="2.5" height="5" rx="0.5" />
      <rect x="9" y="2.5" width="2.5" height="7.5" rx="0.5" />
      <rect x="13.5" y="0" width="2.5" height="10" rx="0.5" />
    </svg>
  );
}

function BatteryIcon({ className = 'h-2.5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 12" fill="currentColor" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="19"
        height="10"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="3" y="3" width="13" height="6" rx="1.5" fill="currentColor" />
      <path d="M21 4.5v3a1.5 1.5 0 001.5-1.5 1.5 1.5 0 00-1.5-1.5z" fill="currentColor" />
    </svg>
  );
}

function VerifiedBadgeIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
    </svg>
  );
}

function DoubleCheckIcon({ className = 'h-2.5 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 11"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 6l3 3L11 2" />
      <path d="M5 6l3 3L15 2" />
    </svg>
  );
}

function ChevronLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function VideoIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CameraIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const benefits = [
  { label: 'New Opportunities', icon: CheckCircleIcon },
  { label: 'Market Updates', icon: BoltIcon },
  { label: 'Career Insights', icon: LayersIcon },
];

const CHANNEL_NOTE =
  'This is an update channel only. Full opportunity details and direct hiring contacts are available through the Opportunity Vaults.';

const floatingBadges = [
  { label: 'Real-time Updates', icon: BoltIcon, position: '-left-[22px] top-[18px]' },
  { label: 'Selected Opportunities', icon: CheckCircleIcon, position: '-right-[22px] top-[120px]' },
  { label: 'Vault Activity', icon: LayersIcon, position: '-left-[22px] bottom-[110px]' },
  { label: 'Be the First to Know', icon: BellIcon, position: '-right-[22px] bottom-[14px]' },
];

interface WhatsAppChannelProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  note?: ReactNode;
}

export default function WhatsAppChannel({
  title = 'Stay Connected to New Opportunities',
  description = 'Get regular updates on new opportunities, key markets and career insights.',
  actionLabel = 'Join WhatsApp Channel',
  note,
}: WhatsAppChannelProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-emerald-100/40 p-4 shadow-[0_28px_90px_-40px_rgba(16,185,129,0.55)] sm:p-10 lg:rounded-[2.5rem] lg:p-12 dark:border-emerald-500/25 dark:from-[#0B1A14] dark:via-emerald-950/40 dark:to-[#0B1A14] dark:shadow-[0_28px_90px_-40px_rgba(6,27,54,0.7)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-emerald-100/80 blur-3xl dark:bg-emerald-700/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-600/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/3 top-1/2 h-44 w-44 rounded-full bg-emerald-300/25 blur-2xl dark:bg-emerald-500/10"
      />

      <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Phone image on a soft, professional background */}
        <div className="order-1 relative mx-auto flex w-full max-w-md items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-200/40 p-4 sm:p-10 dark:from-emerald-950/40 dark:via-emerald-900/25 dark:to-emerald-900/10">
          <div className="relative w-full max-w-[250px] sm:max-w-[272px]">
            {/* Floating feature pills */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 hidden sm:block"
            >
              {floatingBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <span
                    key={badge.label}
                    className={`absolute z-30 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-100/90 bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-[#061B36] shadow-[0_8px_20px_-4px_rgba(6,40,25,0.2)] backdrop-blur-sm dark:border-emerald-500/25 dark:bg-[#0C2118] dark:text-emerald-100 ${badge.position}`}
                  >
                    <Icon className="h-3 w-3 text-[#25D366]" />
                    {badge.label}
                  </span>
                );
              })}
            </div>

            {/* Flagship iPhone 16/18 Series Hardware Chassis */}
            <div className="relative">
              {/* Left Side Hardware Buttons (Action Button, Volume Up, Volume Down) */}
              <div
                aria-hidden="true"
                className="absolute -left-[3.5px] top-[74px] h-[18px] w-[3.5px] rounded-l-sm bg-gradient-to-r from-[#505765] to-[#252A33] shadow-[inset_-1px_0_1px_rgba(255,255,255,0.25)]"
              />
              <div
                aria-hidden="true"
                className="absolute -left-[3.5px] top-[106px] h-[36px] w-[3.5px] rounded-l-sm bg-gradient-to-r from-[#505765] to-[#252A33] shadow-[inset_-1px_0_1px_rgba(255,255,255,0.25)]"
              />
              <div
                aria-hidden="true"
                className="absolute -left-[3.5px] top-[150px] h-[36px] w-[3.5px] rounded-l-sm bg-gradient-to-r from-[#505765] to-[#252A33] shadow-[inset_-1px_0_1px_rgba(255,255,255,0.25)]"
              />

              {/* Right Side Hardware Buttons (Power/Side Button & Camera Control) */}
              <div
                aria-hidden="true"
                className="absolute -right-[3.5px] top-[100px] h-[46px] w-[3.5px] rounded-r-sm bg-gradient-to-l from-[#505765] to-[#252A33] shadow-[inset_1px_0_1px_rgba(255,255,255,0.25)]"
              />
              <div
                aria-hidden="true"
                className="absolute -right-[2.5px] top-[198px] h-[30px] w-[2.5px] rounded-r-sm bg-gradient-to-l from-[#383E4A] to-[#1C2027] ring-1 ring-white/10"
              />

              {/* Titanium Body Outer Rim */}
              <div className="relative overflow-hidden rounded-[48px] sm:rounded-[52px] p-[8px] sm:p-[9px] bg-gradient-to-b from-[#3E4552] via-[#20252E] to-[#13171E] ring-1 ring-white/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65),0_12px_28px_-6px_rgba(0,0,0,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.9)]">
                {/* Antenna Band Lines */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-[60px] h-[2px] w-[3px] bg-[#12161D]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-[60px] h-[2px] w-[3px] bg-[#12161D]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 bottom-[60px] h-[2px] w-[3px] bg-[#12161D]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 bottom-[60px] h-[2px] w-[3px] bg-[#12161D]"
                />

                {/* Inner Bezel & Screen */}
                <div className="relative overflow-hidden rounded-[40px] sm:rounded-[44px] bg-black ring-1 ring-black flex flex-col select-none shadow-2xl">
                  {/* Subtle Screen Glass Sheen */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-20 -top-32 z-30 h-80 w-60 rotate-12 bg-gradient-to-br from-white/12 via-white/[0.03] to-transparent"
                  />

                  {/* iOS Status Bar with Dynamic Island */}
                  <div className="relative z-20 flex h-[38px] items-center justify-between bg-[#075E54] px-5 pt-1.5 text-white">
                    {/* Time */}
                    <span className="text-[11px] font-semibold tracking-tight text-white/95">
                      9:41
                    </span>

                    {/* Dynamic Island */}
                    <div className="absolute left-1/2 top-1.5 -translate-x-1/2 h-[22px] w-[86px] rounded-full bg-black flex items-center justify-between px-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                      {/* Front Camera Lens */}
                      <div className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#080B12] ring-1 ring-[#1C2436]">
                        <div className="h-1 w-1 rounded-full bg-[#182647] shadow-[0_0_2px_#3B82F6]" />
                      </div>
                      {/* TrueDepth Sensor */}
                      <div className="h-1.5 w-1.5 rounded-full bg-[#0C101A]" />
                    </div>

                    {/* Connectivity & Battery */}
                    <div className="flex items-center gap-1.5 text-white/90">
                      <CellularIcon className="h-2.5 w-3.5 fill-current" />
                      <span className="text-[9px] font-bold tracking-tighter">5G</span>
                      <BatteryIcon className="h-2.5 w-5" />
                    </div>
                  </div>

                  {/* WhatsApp Channel Header */}
                  <div className="relative z-20 flex items-center justify-between bg-[#075E54] px-3 pb-2.5 pt-0.5 text-white border-b border-black/10">
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronLeftIcon className="h-4 w-4 shrink-0 text-white" />
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm ring-1 ring-white/20">
                        <WhatsAppIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[11px] font-bold text-white">Gravitas Edge</p>
                          <VerifiedBadgeIcon className="h-3 w-3 shrink-0" />
                        </div>
                        <p className="truncate text-[9px] text-white/80">WhatsApp Channel · online</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5 text-white/90">
                      <VideoIcon className="h-3.5 w-3.5" />
                      <span className="flex flex-col gap-0.5">
                        <span className="h-0.5 w-0.5 rounded-full bg-white" />
                        <span className="h-0.5 w-0.5 rounded-full bg-white" />
                        <span className="h-0.5 w-0.5 rounded-full bg-white" />
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Chat Body */}
                  <div className="relative flex-1 space-y-2.5 bg-[#EFEAE2] px-3 py-3 min-h-[250px]">
                    {/* Subtle Doodle Wallpaper Texture */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(#075E54_1px,transparent_1px)] [background-size:12px_12px]"
                    />

                    {/* Date Pill */}
                    <div className="relative z-10 flex justify-center">
                      <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm border border-black/5">
                        Today
                      </span>
                    </div>

                    {/* Message 1 (Incoming) */}
                    <div className="relative z-10 flex justify-start">
                      <div className="relative max-w-[86%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm border border-slate-100">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#128C7E]">
                          Opportunity Updates
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-800 break-words">
                          Selected opportunity updates, shared as they are sourced.
                        </p>
                        <div className="mt-1 flex items-center justify-end">
                          <span className="text-[8px] text-slate-400">09:42</span>
                        </div>
                      </div>
                    </div>

                    {/* Message 2 (Outgoing) */}
                    <div className="relative z-10 flex justify-end">
                      <div className="relative max-w-[86%] rounded-2xl rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[11px] leading-snug text-slate-900 shadow-sm border border-emerald-100/60 break-words">
                        <p>New or updated application routes as they become available.</p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className="text-[8px] text-slate-500">09:43</span>
                          <DoubleCheckIcon className="h-2.5 w-3 text-[#53BDEB]" />
                        </div>
                      </div>
                    </div>

                    {/* Message 3 (Incoming) */}
                    <div className="relative z-10 flex justify-start">
                      <div className="relative max-w-[86%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm border border-slate-100">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#128C7E]">
                          Vault Activity
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-800 break-words">
                          Vault activity and additions, posted here.
                        </p>
                        <div className="mt-1 flex items-center justify-end">
                          <span className="text-[8px] text-slate-400">09:45</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input Bar */}
                  <div className="relative z-20 flex items-center gap-1.5 bg-[#F0F2F5] px-2.5 pt-2 pb-1.5 border-t border-slate-200/70">
                    <button
                      type="button"
                      aria-label="Add attachment"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/80"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <div className="flex h-7 flex-1 items-center justify-between rounded-full bg-white px-3 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <span className="text-[10px] text-slate-400">Message</span>
                      <CameraIcon className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-sm">
                      <MicIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* iOS Home Indicator Bar */}
                  <div className="relative z-20 flex justify-center bg-[#F0F2F5] pb-1.5 pt-0.5">
                    <div className="h-1 w-28 rounded-full bg-slate-900/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="order-2 flex min-w-0 flex-col items-center text-center [overflow-wrap:anywhere]">
          <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-content sm:text-4xl dark:text-white">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            {description}
          </p>

          <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.label}
                  className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-5 text-center shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold leading-tight text-content dark:text-slate-100">
                    {benefit.label}
                  </span>
                </div>
              );
            })}
          </div>

          <InfoBanner align="center" className="mt-6 w-full">
            {CHANNEL_NOTE}
          </InfoBanner>

          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-3 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1DA851] hover:shadow-xl hover:shadow-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:w-auto sm:px-7 sm:text-base dark:shadow-emerald-500/20"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              {actionLabel}
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Free to join · No spam · Unsubscribe anytime
            </p>
          </div>

          {note && <p className="mt-4 text-sm font-medium text-content-muted">{note}</p>}
        </div>
      </div>
    </div>
  );
}
