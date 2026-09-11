interface InfoBannerProps {
  children: React.ReactNode;
  className?: string;
}

function InfoIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

export default function InfoBanner({ children, className = '' }: InfoBannerProps) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm leading-relaxed text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-sky-200 ${className}`}
    >
      <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-sky-500 dark:text-sky-400" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
