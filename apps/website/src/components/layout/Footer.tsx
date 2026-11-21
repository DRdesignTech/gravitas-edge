'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BRAND_LOGO_SRC } from '@/lib/brand';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCb0FrAe5VxQRICTf2K';

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0012.04 2zm0 18.15a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedInIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

const topCountries = [
  { name: 'United Arab Emirates', href: '/opportunities?country=United+Arab+Emirates' },
  { name: 'Saudi Arabia', href: '/opportunities?country=Saudi+Arabia' },
  { name: 'Singapore', href: '/opportunities?country=Singapore' },
  { name: 'United Kingdom', href: '/opportunities?country=United+Kingdom' },
  { name: 'Germany', href: '/opportunities?country=Germany' },
  { name: 'Kenya', href: '/opportunities?country=Kenya' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('show-toast', { detail: 'Thank you for subscribing to our updates!' }),
      );
    }
    setTimeout(() => {
      setEmail('');
      setSubmitted(false);
    }, 4000);
  };

  const handleOpenOffers = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-splash-modal'));
    }
  };

  return (
    <footer className="bg-[#061B36] text-[#AEB9D6] pt-14 pb-6 text-[0.88rem] leading-[1.55] font-sans" id="footer">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="grid grid-cols-1 min-[540px]:grid-cols-2 min-[801px]:grid-cols-[1.3fr_1fr_1fr_1.2fr] gap-7">
          {/* Column 1: Brand & Office */}
          <div className="min-w-0 min-[540px]:max-[800px]:col-span-full">
            <div className="inline-block bg-white rounded-[14px] px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND_LOGO_SRC}
                alt="Gravitas Edge Consulting logo"
                width={162}
                height={52}
                className="h-[52px] w-auto block"
              />
            </div>
            <p className="text-[#F0C27B] text-[0.72rem] tracking-[0.14em] font-semibold mt-3 mb-2 uppercase leading-[1.55]">
              GLOBAL OPPORTUNITIES. REAL CONNECTIONS.
            </p>
            <p className="text-[#AEB9D6] text-[0.88rem] leading-[1.55]">
              Direct access to curated international opportunities and the people involved in hiring.
            </p>
            <p className="text-[#AEB9D6] text-[0.88rem] leading-[1.55] mt-3">
              704, Mount Sea View Co-operative Housing Society Ltd., J.P. Road, Versova, Andheri (West), Mumbai 400061
            </p>

            {/* Social & WhatsApp Channel Strip (single line) */}
            <div className="mt-4 flex items-center gap-2 flex-nowrap">
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[38px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-3.5 text-[0.8rem] font-semibold text-[#F0C27B] hover:border-[#F0C27B] hover:bg-white/[0.08] hover:text-[#F8D89D] transition-colors shadow-2xs whitespace-nowrap shrink-0"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0 fill-current" />
                <span>Join WhatsApp Channel</span>
              </a>
              <a
                href="https://www.instagram.com/gravitasedgeconsulting"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Gravitas Edge on Instagram"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-white/[0.03] text-[#F0C27B] hover:border-[#F0C27B] hover:bg-white/[0.08] hover:text-[#F8D89D] transition-colors shadow-2xs shrink-0"
              >
                <InstagramIcon className="h-4 w-4 shrink-0" />
              </a>
              <a
                href="https://www.linkedin.com/company/gravitas-edge-consultant/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Gravitas Edge on LinkedIn"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-white/[0.03] text-[#F0C27B] hover:border-[#F0C27B] hover:bg-white/[0.08] hover:text-[#F8D89D] transition-colors shadow-2xs shrink-0"
              >
                <LinkedInIcon className="h-4 w-4 shrink-0 fill-current" />
              </a>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div className="min-w-0">
            <h4 className="text-white font-bold text-[0.9rem] mb-3 leading-[1.15]">Platform</h4>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/opportunities">
              Explore Countries
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/opportunities">
              Search Opportunities
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/vaults">
              Vaults &amp; Pricing
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/plans">
              Build Your Bundle
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/recruitment-vendor">
              Recruitment Vendor Access
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/refer-and-earn">
              Refer &amp; Earn
            </Link>
          </div>

          {/* Column 3: Top countries */}
          <div className="min-w-0">
            <h4 className="text-white font-bold text-[0.9rem] mb-3 leading-[1.15]">Top countries</h4>
            <div id="footCountries">
              {topCountries.map((c) => (
                <Link
                  key={c.name}
                  className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors"
                  href={c.href}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('ge-filter-country', { detail: c.name }),
                      );
                    }
                  }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Newsletter & Resources */}
          <div className="min-w-0 min-[540px]:max-[800px]:col-span-full">
            <h4 className="text-white font-bold text-[0.9rem] mb-3 leading-[1.15]">Newsletter</h4>
            <p className="text-[#AEB9D6] text-[0.88rem] mb-2.5 leading-[1.55]">New roles, countries and market updates.</p>
            <form
              className="flex items-center bg-white/[0.08] border border-white/[0.16] rounded-full p-1"
              onSubmit={handleNewsletterSubmit}
              id="footNews"
              noValidate
            >
              <input
                id="fnEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                aria-label="Email for newsletter"
                disabled={submitted}
                required
                className="flex-1 min-w-0 bg-transparent border-0 text-white font-sans text-[0.85rem] leading-[1.55] px-[10px] py-[6px] outline-none placeholder:text-[#8C9AC0] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitted}
                className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] border-0 rounded-full px-4 py-[7px] font-bold text-[0.82rem] leading-none transition-colors shrink-0 disabled:opacity-75 cursor-pointer"
              >
                {submitted ? 'Joined' : 'Join'}
              </button>
            </form>
            <Link
              className="block text-[#F0C27B] hover:text-white mt-2 mb-1.5 text-[0.88rem] leading-[1.55] text-left transition-colors cursor-pointer"
              href="/#newsletter"
            >
              + Add a note on what jobs you want
            </Link>

            <h4 className="text-white font-bold text-[0.9rem] mt-[22px] mb-3 leading-[1.15]">Resources</h4>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/opportunities">
              Free Preview
            </Link>
            <button
              type="button"
              className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors bg-transparent border-0 p-0 cursor-pointer font-inherit"
              onClick={handleOpenOffers}
            >
              Current Offers
            </button>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/upload-resume">
              Upload Resume
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/faq">
              FAQ
            </Link>
            <Link className="block text-[#AEB9D6] hover:text-white my-1.5 text-left text-[0.88rem] leading-[1.55] transition-colors" href="/contact">
              Contact Us
            </Link>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="border-t border-white/10 mt-9 pt-[18px] flex flex-wrap gap-x-[18px] gap-y-2 justify-between text-[#AEB9D6] text-[0.88rem] leading-[1.55]">
          <span>
            © {year} Gravitas Edge Consulting. An opportunity-information service, not a recruitment agency.
          </span>
          <span>
            <Link className="hover:text-white transition-colors" href="/privacy-policy">Privacy</Link> ·{' '}
            <Link className="hover:text-white transition-colors" href="/terms-and-conditions">Terms</Link> ·{' '}
            <Link className="hover:text-white transition-colors" href="/refund-policy">Refund</Link> ·{' '}
            <Link className="hover:text-white transition-colors" href="/cookie-policy">Cookies</Link> ·{' '}
            <Link className="hover:text-white transition-colors" href="/disclaimer">Disclaimer</Link> ·{' '}
            <Link className="hover:text-white transition-colors" href="/referral-terms">Referral Terms</Link> ·{' '}
            <Link className="hover:text-white transition-colors" href="/candidate-resume-notice">Candidate Resume Notice</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
