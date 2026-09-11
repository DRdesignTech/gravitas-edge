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
          <p className="text-sm text-content-faint">
            © {year} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
