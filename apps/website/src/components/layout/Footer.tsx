import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCb0FrAe5VxQRICTf2K';

const platformLinks = [
  { href: '/vaults', label: 'Opportunity Vaults' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/plans', label: 'Plans & Pricing' },
  { href: '/faq', label: 'FAQ' },
];

// "About Us" is intentionally omitted — no /about route exists yet.
const companyLinks = [{ href: '/contact', label: 'Contact Us' }];

// Existing career resources (no blog route exists yet).
const resourceLinks = [
  { href: '/opportunities', label: 'Free Preview' },
  { href: '/upload-resume', label: 'Upload Resume' },
];

// Social icons render only when URLs are configured (none are configured today).
const socialLinks: { label: string; href: string }[] = [];

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

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="footer" className="scroll-mt-20 bg-[#061B36] text-white">
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
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-[#E3B968] transition-colors hover:border-[#C8943E] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061B36]"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Join WhatsApp Channel
            </a>
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
              © {year} Designed, Developed &amp; Marketed by PR Digital Marketing Gwalior
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

            {socialLinks.length > 0 && (
              <div className="flex items-center justify-center gap-3 lg:justify-end">
                {socialLinks.map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/75 transition-colors hover:text-[#E3B968]"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
