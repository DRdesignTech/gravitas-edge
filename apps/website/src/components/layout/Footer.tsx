import Link from 'next/link';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-auto" nameClassName="text-sm font-bold text-content" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/opportunities" className="text-sm text-content-muted hover:text-content">
              Opportunities
            </Link>
            <Link href="/plans" className="text-sm text-content-muted hover:text-content">
              Plans
            </Link>
            <Link href="/dashboard" className="text-sm text-content-muted hover:text-content">
              Dashboard
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
