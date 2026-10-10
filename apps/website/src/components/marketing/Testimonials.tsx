'use client';

import { useState } from 'react';

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
] as const;

function StarIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.26 6.9.6-5.2 4.55 1.55 6.74L12 16.9l-6.15 3.25 1.55-6.74L2.2 8.86l6.9-.6L12 2z" />
    </svg>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === 'right' ? <path d="m9 5 7 7-7 7" /> : <path d="m15 5-7 7 7 7" />}
    </svg>
  );
}

function TestimonialCard({ item }: { item: (typeof testimonials)[number] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#061B36] font-serif-heading text-sm font-bold text-[#C8943E]"
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
        <span className="whitespace-nowrap rounded-full border border-[#C8943E]/30 bg-[#061B36] px-3 py-1 text-[10px] font-semibold tracking-wide text-[#C8943E] sm:text-xs">
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

function Controls({
  index,
  count,
  onPrev,
  onNext,
  onSelect,
}: {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-center gap-4 md:hidden">
      <button
        type="button"
        onClick={onPrev}
        disabled={index === 0}
        aria-label="Previous testimonial"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C8943E]/40 bg-surface text-[#C8943E] transition-colors hover:bg-[#C8943E] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Chevron direction="left" />
      </button>
      <div className="flex items-center gap-2" role="tablist" aria-label="Testimonial slides">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Go to testimonial ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === index ? 'bg-[#C8943E]' : 'bg-[#C8943E]/30'
            }`}
          >
            <span className="sr-only">
              Slide {i + 1} of {count}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={index === count - 1}
        aria-label="Next testimonial"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C8943E]/40 bg-surface text-[#C8943E] transition-colors hover:bg-[#C8943E] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Chevron direction="right" />
      </button>
    </div>
  );
}

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const count = testimonials.length;

  return (
    <section id="testimonials" className="scroll-mt-20 bg-surface-muted">
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

        {/* Mobile carousel */}
        <div
          className="mt-12 overflow-hidden md:hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label="Subscriber testimonials"
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="w-full shrink-0 px-1"
                role="group"
                aria-roledescription="slide"
                aria-label={item.name}
              >
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </div>
        <Controls
          index={index}
          count={count}
          onPrev={() => setIndex((i) => Math.max(0, i - 1))}
          onNext={() => setIndex((i) => Math.min(count - 1, i + 1))}
          onSelect={(i) => setIndex(i)}
        />

        {/* Desktop grid */}
        <div className="mt-12 hidden gap-6 md:grid md:grid-cols-2">
          {testimonials.map((item) => (
            <TestimonialCard key={item.name} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
