'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type TestimonialItem = {
  name: string;
  role: string;
  badge?: string | null;
  quote: string;
  linkedinUrl?: string | null;
};

const fallbackTestimonials: TestimonialItem[] = [
  {
    name: 'Simran Khurana',
    badge: '45% Pay Jump',
    role: 'Lead Product Manager @ FinTech Growth Scale-Up',
    quote:
      'I found a Lead PM role 3 weeks before it was posted publicly on LinkedIn. Applied directly to the VP via the email provided in the Gravitas Vault, and was offered India-competitive premium equity + a 45% pay bump.',
  },
  {
    name: 'Adil Mahmood',
    badge: 'Tax-Free UAE Relocation',
    role: 'Director of Infrastructure @ Enterprise SaaS (Dubai)',
    quote:
      'Moving to Dubai was my goal. The Middle East Vault gave me the direct headhunter list and active pre-market roles. I contacted the talent partner directly and landed a key tax-free package without applying blindly on portals.',
  },
  {
    name: 'Neha Bansal',
    badge: 'Hired in 12 Days',
    role: 'Senior Data Engineer @ Global Analytics Firm (Hybrid)',
    quote:
      'The India Vault surfaced a Senior Data Engineer role that was only being shared through internal referrals. I reached the hiring manager directly and had an offer in under two weeks — no portal queue, no blind applications.',
  },
  {
    name: 'Rohan Mehta',
    badge: 'Pre-Market Access',
    role: 'Growth Marketing Lead @ D2C Brand (Bengaluru)',
    quote:
      'I connected with the founder before the role was even advertised. The direct contact in the Vault made the difference — the whole process felt personal and fast instead of automated.',
  },
  {
    name: 'Aisha Rahman',
    badge: 'Back After a Break',
    role: 'Finance Controller @ Manufacturing Group (Pune)',
    quote:
      'After a two-year career break I was nervous about portals. Gravitas Edge let me speak to the consultant actually hiring for the role, which rebuilt my confidence and led to a strong offer.',
  },
  {
    name: 'Vikram Nair',
    badge: '35% Pay Uplift',
    role: 'VP Engineering @ HealthTech Platform',
    quote:
      'The senior leadership opportunities were genuinely above my current band. Direct access to the decision-maker helped me negotiate a 35% pay uplift and a clear path into a CTO track.',
  },
  {
    name: 'Priya Sethi',
    badge: 'Global Relocation',
    role: 'Regional Sales Director @ Logistics MNC (Singapore)',
    quote:
      'The International Vault gave me recruiter contacts across Singapore and the Gulf. I interviewed directly with the regional head and relocated with full visa support.',
  },
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StarIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.26 6.9.6-5.2 4.55 1.55 6.74L12 16.9l-6.15 3.25 1.55-6.74L2.2 8.86l6.9-.6L12 2z" />
    </svg>
  );
}

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <div className="flex h-full w-[224px] min-[900px]:w-[250px] shrink-0 flex-col rounded-xl border border-[#E9E5DC] bg-gradient-to-b from-white to-[#FCFAF6] p-[18px] pb-4 shadow-[0_6px_18px_-12px_rgba(6,27,54,0.3)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-[#1E3557] dark:from-[#0E2340] dark:to-[#0B1C34] dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#061B36] text-[10px] font-bold text-[#D6952F] ring-1 ring-[#D6952F]/30"
        >
          {initials(item.name)}
        </span>
        {item.badge && (
          <span className="whitespace-nowrap rounded-full bg-[#061B36] px-2 py-0.5 text-[9px] font-semibold text-[#F0C27B] dark:bg-[#1D3B66]">
            {item.badge}
          </span>
        )}
      </div>

      <div
        className="my-2 flex items-center gap-0.5 text-[#D6952F]"
        role="img"
        aria-label="Rated 5 out of 5 stars"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} />
        ))}
      </div>

      <blockquote className="flex-1 text-[11.5px] leading-[1.6] text-[#1A2236] dark:text-[#E2E8F0]">
        &ldquo;{item.quote}&rdquo;
      </blockquote>

      <div className="mt-3.5 border-t border-[#E9E5DC] pt-3 dark:border-[#1E3557]">
        {item.linkedinUrl ? (
          <a
            href={item.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 text-[11px] font-bold text-[#061B36] transition-colors hover:text-[#D6952F] dark:text-white dark:hover:text-[#F0C27B]"
            title={`Open ${item.name}'s LinkedIn profile`}
          >
            <span>{item.name}</span>
            <svg
              aria-hidden="true"
              className="h-3 w-3 text-[#D6952F] transition-transform group-hover:-translate-y-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          </a>
        ) : (
          <b className="block text-[11px] font-bold text-[#061B36] dark:text-white">
            {item.name}
          </b>
        )}
        <span className="mt-0.5 block text-[10px] leading-tight text-[#5B6479] dark:text-[#94A3B8]">
          {item.role}
        </span>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(fallbackTestimonials);

  useEffect(() => {
    let active = true;
    apiFetch<TestimonialItem[]>('/testimonials')
      .then((items) => {
        if (active && Array.isArray(items) && items.length > 0) {
          setTestimonials(items);
        }
      })
      .catch(() => {
        // On failure keep the static list so the section never looks broken.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="testimonials"
      className="relative py-16 lg:py-20 bg-[radial-gradient(900px_300px_at_50%_0%,#F7EFE2_0%,rgba(247,239,226,0)_75%)] dark:bg-transparent"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#C8842D] dark:text-[#F0C27B] mb-2.5">
            What our subscribers say
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-[#061B36] sm:text-4xl lg:text-[2.6rem] leading-[1.15] dark:text-white mb-2">
            What Our Subscribers Say
          </h2>
          <p className="text-[0.95rem] text-[#1A2236] dark:text-slate-300">
            Real feedback from professionals.
          </p>
        </div>
      </div>

      {testimonials.length > 0 && (
        <div
          className="mt-8 overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_9%,#000_91%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_9%,#000_91%,transparent)]"
          role="region"
          aria-label="Subscriber testimonials"
        >
          <div className="flex w-max animate-[marquee-scroll_42s_linear_infinite] hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-4 pr-4">
                {testimonials.map((item) => (
                  <TestimonialCard key={`${copy}-${item.name}`} item={item} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-[0.85rem] text-[#5B6479] dark:text-slate-400">
        Individual subscriber experiences. Outcomes vary and are not guaranteed.
      </p>
    </section>
  );
}
