import Link from 'next/link';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-auto" nameClassName="text-sm font-bold text-content" />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/" className="text-sm text-content-muted hover:text-content">
              Home
            </Link>
            <Link href="/how-it-works" className="text-sm text-content-muted hover:text-content">
              How It Works
            </Link>
            <Link href="/opportunities" className="text-sm text-content-muted hover:text-content">
              Free Preview
            </Link>
            <Link href="/vaults" className="text-sm text-content-muted hover:text-content">
              Vaults
            </Link>
            <Link href="/upload-resume" className="text-sm text-content-muted hover:text-content">
              Resume
            </Link>
            <Link href="/plans" className="text-sm text-content-muted hover:text-content">
              Plans
            </Link>
            <Link href="/faq" className="text-sm text-content-muted hover:text-content">
              FAQ
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-line pt-6">
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            <Link href="/privacy-policy" className="text-xs text-content-faint hover:text-content">
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-xs text-content-faint hover:text-content"
            >
              Terms & Conditions
            </Link>
            <Link href="/refund-policy" className="text-xs text-content-faint hover:text-content">
              Refund Policy
            </Link>
            <Link href="/cookie-policy" className="text-xs text-content-faint hover:text-content">
              Cookie Policy
            </Link>
            <Link href="/disclaimer" className="text-xs text-content-faint hover:text-content">
              Disclaimer
            </Link>
            <Link href="/contact" className="text-xs text-content-faint hover:text-content">
              Contact
            </Link>
            <Link href="/referral-terms" className="text-xs text-content-faint hover:text-content">
              Referral Programme Terms
            </Link>
            <Link
              href="/candidate-resume-notice"
              className="text-xs text-content-faint hover:text-content"
            >
              Candidate Resume Notice
            </Link>
          </nav>
          <p className="mt-4 text-center text-sm text-content-faint">
            © {year} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
