'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HIDDEN_PREFIXES = ['/login', '/register', '/dashboard'];

function UploadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

export default function FloatingResumeButton() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <Link
      href="/upload-resume"
      aria-label="Upload your resume"
      className="fixed bottom-[5.5rem] right-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:bottom-6 sm:right-6 sm:px-6 sm:py-3.5"
    >
      <UploadIcon />
      <span>Upload Resume</span>
    </Link>
  );
}
