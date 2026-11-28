'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import ScrollReveal from './ScrollReveal';

export interface FaqItemData {
  id?: number | string;
  question: string;
  answer: string;
}

const REDESIGN_FAQS: FaqItemData[] = [
  {
    question: 'What is Gravitas Edge?',
    answer:
      'An opportunity-information service. We share curated job opportunities and, where available, recruiter or hiring-manager contact details or application pathways. We are not a recruitment agency or placement service and do not guarantee interviews or employment.',
  },
  {
    question: 'Which vaults are available?',
    answer:
      'Multiple seniority- and region-aligned vaults: Early Career (0–5 yrs), Management (5–10 yrs), Leadership (10–15 yrs), Executive & C-Suite (15+ yrs), UAE & Global Access, Remote Cross-Border Access, and Executive Premier Access across international hubs.',
  },
  {
    question: 'Do Global vaults cover multiple regions?',
    answer:
      'Yes. Our Global and UAE & Global vaults cover international executive and leadership opportunities across Europe, the Middle East & GCC, North America, Asia-Pacific, and cross-border remote corridors.',
  },
  {
    question: 'How is my price decided?',
    answer:
      'By your billing region and selected currency. International billing addresses are supported with transparent multi-currency display, and checkout shows the exact final currency, taxes, and renewal terms before you pay.',
  },
  {
    question: 'How does Build Your Bundle work?',
    answer:
      'Combine any eligible regional vault with its matching Global Access vault for 20% off, in one checkout with one renewal date. The discount applies while both stay active; cancelling either removes it.',
  },
  {
    question: 'Do I pay to apply?',
    answer:
      'No. You never pay an employer or recruiter. Your subscription pays for access to opportunity information.',
  },
  {
    question: 'Can I preview opportunities first?',
    answer:
      'Review the Free Preview and the country directory before subscribing, and subscribe only if what you see is relevant to you.',
  },
  {
    question: 'Are there refunds?',
    answer:
      'Access is digital and immediate, so subscriptions are non-refundable. You confirm this before paying.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  return (
    <div className="mb-2.5 rounded-xl border border-[#E9E5DC] bg-white p-4 shadow-sm transition-all duration-200 sm:px-[18px] sm:py-4 dark:border-[#1E3557] dark:bg-[#0E2340]">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (contentRef.current) setHeight(next ? contentRef.current.scrollHeight : 0);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left text-[0.95rem] font-bold text-[#061B36] transition-colors hover:text-[#C8842D] sm:text-[1rem] dark:text-white dark:hover:text-[#F0C27B]"
      >
        <span className="flex-1">{question}</span>
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center text-[1.3rem] font-light leading-none text-[#D6952F] select-none"
        >
          {open ? '–' : '+'}
        </span>
      </button>
      <div
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="pt-2.5 text-[0.93rem] leading-[1.55] text-[#5B6479] dark:text-slate-300"
        >
          {answer}
        </div>
      </div>
    </div>
  );
}

export interface FaqSectionProps {
  items?: FaqItemData[];
  title?: string;
  eyebrow?: string;
}

export default function FaqSection({
  items = REDESIGN_FAQS,
  title = 'Questions, answered',
  eyebrow = 'FAQs',
}: FaqSectionProps) {
  return (
    <section id="faq" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6">
        <ScrollReveal className="mb-7 text-center">
          <span className="mb-2 inline-block text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[#15803D] dark:text-emerald-400">
            {eyebrow}
          </span>
          <h2 className="text-3xl font-bold leading-[1.15] tracking-tight text-[#061B36] sm:text-4xl lg:text-[2.5rem] dark:text-white">
            {title}
          </h2>
        </ScrollReveal>

        <div className="w-full">
          {items.map((item, idx) => (
            <ScrollReveal key={item.id ?? idx} delay={Math.min(idx * 55, 330)}>
              <FaqItem question={item.question} answer={item.answer} />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={150} className="mt-7 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E9E5DC] bg-white px-5 py-2.5 text-sm font-semibold text-[#061B36] shadow-sm transition-all duration-200 hover:border-[#061B36] hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white dark:hover:border-slate-500"
          >
            View all frequently asked questions
            <span aria-hidden="true">→</span>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
