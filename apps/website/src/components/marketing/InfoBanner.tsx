interface InfoBannerProps {
  children: React.ReactNode;
  className?: string;
  /** `center` centers the icon and text; defaults to left-aligned. */
  align?: 'left' | 'center';
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

export default function InfoBanner({ children, className = '', align = 'left' }: InfoBannerProps) {
  const centered = align === 'center';
  return (
    <div
      role="status"
      className={`rounded-2xl border border-[#C8943E]/30 bg-[#FFF3D9] px-5 py-4 text-sm leading-relaxed text-[#7A5A1E] dark:border-[#C8943E]/30 dark:bg-brand-950 dark:text-brand-200 ${
        centered
          ? 'flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-3'
          : 'flex items-start gap-3'
      } ${className}`}
    >
      <InfoIcon className={`h-5 w-5 shrink-0 text-[#C8943E] ${centered ? '' : 'mt-0.5'}`} />
      <div className={centered ? 'min-w-0 sm:text-left' : 'min-w-0'}>{children}</div>
    </div>
  );
}
