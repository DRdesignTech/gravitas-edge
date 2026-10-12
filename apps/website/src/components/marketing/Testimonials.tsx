'use client';

const testimonials = [
  {
    name: 'Simran Khurana',
    initials: 'SK',
    badge: '45% Pay Jump',
    role: 'Lead Product Manager @ FinTech Growth Scale-Up',
    quote:
      'I found a Lead PM role 3 weeks before it was posted publicly on LinkedIn. Applied directly to the VP via the email provided in the Gravitas Vault, and was offered India-competitive premium equity + a 45% pay bump.',
  },
  {
    name: 'Adil Mahmood',
    initials: 'AM',
    badge: 'Tax-Free UAE Relocation',
    role: 'Director of Infrastructure @ Enterprise SaaS (Dubai)',
    quote:
      'Moving to Dubai was my goal. The Middle East Vault gave me the direct headhunter list and active pre-market roles. I contacted the talent partner directly and landed a key tax-free package without applying blindly on portals.',
  },
  {
    name: 'Neha Bansal',
    initials: 'NB',
    badge: 'Hired in 12 Days',
    role: 'Senior Data Engineer @ Global Analytics Firm (Hybrid)',
    quote:
      'The India Vault surfaced a Senior Data Engineer role that was only being shared through internal referrals. I reached the hiring manager directly and had an offer in under two weeks — no portal queue, no blind applications.',
  },
  {
    name: 'Rohan Mehta',
    initials: 'RM',
    badge: 'Pre-Market Access',
    role: 'Growth Marketing Lead @ D2C Brand (Bengaluru)',
    quote:
      'I connected with the founder before the role was even advertised. The direct contact in the Vault made the difference — the whole process felt personal and fast instead of automated.',
  },
  {
    name: 'Aisha Rahman',
    initials: 'AR',
    badge: 'Back After a Break',
    role: 'Finance Controller @ Manufacturing Group (Pune)',
    quote:
      'After a two-year career break I was nervous about portals. Gravitas Edge let me speak to the consultant actually hiring for the role, which rebuilt my confidence and led to a strong offer.',
  },
  {
    name: 'Vikram Nair',
    initials: 'VN',
    badge: '35% Pay Uplift',
    role: 'VP Engineering @ HealthTech Platform',
    quote:
      'The senior leadership opportunities were genuinely above my current band. Direct access to the decision-maker helped me negotiate a 35% pay uplift and a clear path into a CTO track.',
  },
  {
    name: 'Priya Sethi',
    initials: 'PS',
    badge: 'Global Relocation',
    role: 'Regional Sales Director @ Logistics MNC (Singapore)',
    quote:
      'The International Vault gave me recruiter contacts across Singapore and the Gulf. I interviewed directly with the regional head and relocated with full visa support.',
  },
] as const;

function StarIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.26 6.9.6-5.2 4.55 1.55 6.74L12 16.9l-6.15 3.25 1.55-6.74L2.2 8.86l6.9-.6L12 2z" />
    </svg>
  );
}

function TestimonialCard({ item }: { item: (typeof testimonials)[number] }) {
  return (
    <div className="card-static flex h-full flex-col rounded-2xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 font-serif-heading text-sm font-bold leading-none text-[#C8943E] ring-1 ring-inset ring-[#C8943E]/30"
          >
            {item.initials}
          </span>
          <span
            className="flex items-center gap-0.5 text-[#C8943E]"
            role="img"
            aria-label="Rated 5 out of 5 stars"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} />
            ))}
          </span>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[#C8943E]/30 bg-brand-600 px-3 py-1 text-[10px] font-semibold tracking-wide text-[#C8943E] sm:text-xs">
          {item.badge}
        </span>
      </div>

      <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-content-muted sm:mt-6 sm:text-base">
        &ldquo;{item.quote}&rdquo;
      </blockquote>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm font-bold text-content">{item.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-content-muted sm:text-sm">{item.role}</p>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="section-glow relative scroll-mt-20 bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8943E]">
            What Our Subscribers Say
          </p>
          <h2 className="mt-4 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl lg:text-5xl">
            What Our Subscribers Say
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-content-muted sm:text-lg">
            Real feedback from professionals.
          </p>
        </div>

        {/* Auto-scrolling marquee (duplicated list for a seamless loop) */}
        <div
          className="mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
          role="region"
          aria-label="Subscriber testimonials"
        >
          <div className="flex w-max animate-marquee">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 gap-6 pr-6"
              >
                {testimonials.map((item) => (
                  <div key={item.name} className="w-[85vw] max-w-sm shrink-0 sm:w-[360px]">
                    <TestimonialCard item={item} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
