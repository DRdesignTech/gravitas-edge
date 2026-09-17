import Link from 'next/link';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';
import HomeAnchor from '@/components/marketing/HomeAnchor';

const sectionLinks = [
  { href: '#home', label: 'Home' },
  { href: '#free-preview', label: 'Free Preview' },
  { href: '#vaults', label: 'Opportunity Vaults' },
  { href: '#plans', label: 'Plans' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#faq', label: 'FAQ' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="footer" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-10 w-auto" nameClassName="text-sm font-bold text-content" />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {sectionLinks.map((link) => (
              <HomeAnchor
                key={link.href}
                href={link.href}
                className="text-sm text-content-muted hover:text-content"
              >
                {link.label}
              </HomeAnchor>
            ))}
            <Link href="/upload-resume" className="text-sm text-content-muted hover:text-content">
              Resume
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
