'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { faqData } from '@/data/faq-data';
import Eyebrow from '@/components/marketing/Eyebrow';

const FEATURED_FAQ_IDS = [1, 6, 17, 20, 21, 24];

function ChevronDownIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (contentRef.current) setHeight(next ? contentRef.current.scrollHeight : 0);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-content transition-colors hover:text-brand-700 dark:hover:text-brand-300 sm:text-base"
      >
        <span className="flex-1">{question}</span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-content-faint transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="pb-4 text-sm leading-relaxed text-content-muted sm:text-base"
        >
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const featured = faqData.filter((item) => FEATURED_FAQ_IDS.includes(item.id));

  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-white dark:bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
            Frequently asked questions.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            The quick answers most people look for before exploring the Vaults and subscribing.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface px-5 py-1 shadow-card dark:bg-surface-elevated sm:px-7">
          {featured.map((item) => (
            <FaqItem key={item.id} question={item.question} answer={item.answer} />
          ))}
        </div>

        <div className="mt-6">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-content shadow-sm transition-colors hover:border-brand-300 hover:bg-surface-muted dark:bg-surface-elevated"
          >
            View all frequently asked questions
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
