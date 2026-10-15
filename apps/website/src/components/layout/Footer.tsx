import Link from 'next/link';
import type { ReactNode } from 'react';
import BrandLogo from '@/components/brand/BrandLogo';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCb0FrAe5VxQRICTf2K';

const BUSINESS_ADDRESS =
  '704, Mount Sea View Co-operative Housing Society Ltd., J.P. Road, Versova, Andheri (West), Mumbai 400061';

const platformLinks = [
  { href: '/vaults', label: 'Opportunity Vaults' },
  { href: '/recruitment-vendor', label: 'Recruitment Vendor Access' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/plans', label: 'Plans & Pricing' },
  { href: '/refer-and-earn', label: 'Refer & Earn' },
  { href: '/faq', label: 'FAQ' },
];

// "About Us" is intentionally omitted — no /about route exists yet.
const companyLinks = [{ href: '/contact', label: 'Contact Us' }];

// Existing career resources (no blog route exists yet).
const resourceLinks = [
  { href: '/opportunities', label: 'Free Preview' },
  { href: '/upload-resume', label: 'Upload Resume' },
];

const socialLinks: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/gravitasedgeconsulting',
    icon: <InstagramIcon className="h-4 w-4" />,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/gravitas-edge-consultant/',
    icon: <LinkedInIcon className="h-4 w-4" />,
  },
];

const legalLinks = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/referral-terms', label: 'Referral Programme Terms' },
  { href: '/candidate-resume-notice', label: 'Candidate Resume Notice' },
];

const columnLinkClass =
  'text-sm text-slate-300 transition-colors hover:text-[#E3B968] focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4';

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="text-center lg:text-left">
      <h3 className="font-serif-heading text-sm font-semibold uppercase tracking-[0.14em] text-[#C8943E]">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={columnLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.06 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.43.36 1.06.42 2.23.06 1.27.07 1.65.07 4.84s-.01 3.57-.07 4.84c-.06 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.17-1.06.36-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.06-1.8-.25-2.23-.42a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.17-.43-.36-1.06-.42-2.23-.06-1.27-.07-1.65-.07-4.84s.01-3.57.07-4.84c.06-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.17 1.06-.36 2.23-.42C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.67.93 3.34.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.8.72 1.47 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.8-.3 1.47-.72 2.12-1.38.66-.65 1.08-1.32 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.12A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-10.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="footer" className="bg-[#061B36] text-white">
      {/* Slim gold accent line */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-[#C8943E]/60 to-transparent"
      />

      {/* ── Main footer ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-8">
          {/* Branding */}
          <div className="col-span-2 mx-auto flex max-w-sm flex-col items-center text-center sm:col-span-3 lg:col-span-1 lg:mx-0 lg:items-start lg:text-left">
            <Link
              href="/"
              aria-label="Gravitas Edge Consulting — home"
              className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061B36]"
            >
              <BrandLogo className="h-11 w-auto" showName={false} />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-slate-300">
              Direct access to curated opportunities and the people involved in hiring.
            </p>
            <address className="mt-4 flex max-w-xs items-start gap-2 text-left text-sm not-italic leading-relaxed text-slate-300">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#C8943E]" />
              <span>{BUSINESS_ADDRESS}</span>
            </address>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-[#E3B968] transition-colors hover:border-[#C8943E] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061B36]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Join WhatsApp Channel
              </a>

              {socialLinks.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#E3B968] transition-colors hover:border-[#C8943E] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061B36]"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Platform" links={platformLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:text-left">
            <p className="text-xs text-white/60 sm:text-sm">
              © {year} Designed, Developed &amp; Marketed by{' '}
              <a
                href="https://prdigitalmarketing.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/30 underline-offset-4 hover:text-white"
              >
                PR Digital Marketing Gwalior
              </a>
            </p>

            <nav
              aria-label="Legal"
              className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 lg:justify-end"
            >
              {legalLinks.map((link, index) => (
                <span key={link.href} className="inline-flex items-center gap-x-2.5">
                  {index > 0 && (
                    <span aria-hidden="true" className="select-none text-xs text-[#C8943E]/50">
                      |
                    </span>
                  )}
                  <Link
                    href={link.href}
                    className="text-xs text-white/70 transition-colors hover:text-[#E3B968] focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4 sm:text-[13px]"
                  >
                    {link.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
