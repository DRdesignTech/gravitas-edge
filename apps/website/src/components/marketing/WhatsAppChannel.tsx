import type { ReactNode } from 'react';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCb0FrAe5VxQRICTf2K';

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0012.04 2zm0 18.15a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function ClockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.25l2.5 2.5 4.5-5" />
    </svg>
  );
}

function LayersIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

function BellIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

const benefits = [
  { label: 'Timely Updates', icon: BoltIcon },
  { label: 'Selected Opportunities', icon: CheckCircleIcon },
  { label: 'Vault Activity', icon: LayersIcon },
  { label: 'Stay Informed', icon: BellIcon },
];

const floatingBadges = [
  { label: 'Real-time Updates', icon: BoltIcon, position: '-left-[20px] -top-[5px]' },
  { label: 'Curated Opportunities', icon: CheckCircleIcon, position: '-right-[20px] top-1/4' },
  { label: 'Vault Activity', icon: LayersIcon, position: '-left-[20px] bottom-24' },
  { label: 'Be the First to Know', icon: BellIcon, position: '-right-[20px] -bottom-[5px]' },
];

interface WhatsAppChannelProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  note?: ReactNode;
}

export default function WhatsAppChannel({
  title = 'Not ready to subscribe? Stay connected for free.',
  description = 'Join the free Gravitas Edge WhatsApp Channel to follow selected opportunity updates and see what is being added across the Opportunity Vaults. The channel keeps you updated on opportunities and Vault activity. Full opportunity details and available recruiter, hiring manager, consultant or application contact information remain available through the relevant Opportunity Vault.',
  actionLabel = 'Join Free WhatsApp Channel',
  note,
}: WhatsAppChannelProps) {
  return (
    <div className="relative overflow-hidden lg:overflow-visible rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/80 to-emerald-50/40 p-7 shadow-[0_28px_90px_-40px_rgba(16,185,129,0.55)] sm:p-10 lg:rounded-[2.5rem] lg:p-14 dark:border-emerald-500/25 dark:from-[#0B1A14] dark:via-emerald-950/40 dark:to-[#0B1A14] dark:shadow-[0_28px_90px_-40px_rgba(0,0,0,0.7)]">
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-10 top-8 h-1.5 w-1.5 rounded-full bg-emerald-400/70 dark:bg-emerald-400/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-16 h-2 w-2 rounded-full bg-emerald-400/50 dark:bg-emerald-400/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-14 h-1 w-1 rounded-full bg-emerald-500/50 dark:bg-emerald-500/30"
      />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-400">
            Stay Ahead
          </span>
          <h2 className="mt-4 max-w-xl text-3xl font-extrabold leading-[1.15] tracking-tight text-[#0A1730] sm:text-4xl dark:text-white">
            Not ready to subscribe?{' '}
            <span className="text-emerald-600 dark:text-emerald-400">Stay connected for free.</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            {description}
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <li
                  key={benefit.label}
                  className="flex items-center gap-1 rounded-xl border border-emerald-100 bg-white/80 px-1.5 py-1.5 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-[#0A1730] sm:text-xs dark:text-slate-100">
                    {benefit.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative">
          <div className="relative mx-auto w-full max-w-[250px] lg:max-w-[265px]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
              {floatingBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <span
                    key={badge.label}
                    className={`absolute z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-100 bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-[#0A1730] shadow-lg dark:border-emerald-500/25 dark:bg-[#0C2118] dark:text-emerald-100 ${badge.position}`}
                  >
                    <Icon className="h-3 w-3 text-[#25D366]" />
                    {badge.label}
                  </span>
                );
              })}
            </div>

            <div className="relative w-full rounded-[2.4rem] border-[6px] border-[#0B2A20] bg-white shadow-2xl dark:shadow-black/60 overflow-hidden">
              <div className="flex items-center justify-between gap-2 rounded-t-[1.95rem] bg-[#075E54] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#128C7E]">
                    <WhatsAppIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[11px] font-bold text-white">Gravitas Edge</p>
                    <p className="truncate text-[9px] text-white/80">WhatsApp Channel · online</p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-white/85">
                  <span className="h-1 w-1 rounded-full bg-white/70" />
                  <span className="h-1 w-1 rounded-full bg-white/70" />
                  <span className="h-1 w-1 rounded-full bg-white/70" />
                </span>
              </div>

              <div className="space-y-2.5 bg-[#ECE5DD] px-2.5 py-3.5">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[#128C7E]">
                      Opportunity Updates
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-700 break-words">
                      Selected opportunity updates, shared as they are sourced.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#DCF8C6] px-3 py-2 text-[11px] leading-snug text-slate-800 shadow-sm break-words">
                    New or updated application routes as they become available.
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[#128C7E]">
                      Vault Activity
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-700 break-words">
                      Vault activity and additions, posted here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-b-[1.95rem] bg-white px-2.5 py-2.5">
                <div className="flex h-8 flex-1 items-center rounded-full bg-[#F0F0F0] px-3 text-[10px] text-slate-400">
                  Message
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <MicIcon className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 lg:mt-10">
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1DA851] hover:shadow-xl hover:shadow-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:w-auto sm:px-7 sm:text-base dark:shadow-emerald-500/20"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {actionLabel}
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Free to join · No spam · Unsubscribe anytime
            </p>
          </div>
        </div>
      </div>

      {note && (
        <div className="relative mt-9 flex flex-col items-center gap-2 border-t border-emerald-200/60 pt-5 lg:mt-12 dark:border-emerald-500/20">
          {note}
        </div>
      )}
    </div>
  );
}