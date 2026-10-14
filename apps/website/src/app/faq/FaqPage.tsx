'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { faqData, faqCategories } from '@/data/faq-data';
import type { FaqItem } from '@/data/faq-data';
import { EmptyState } from '@/components/ui';

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="rounded bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function CloseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
  query,
  id,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  query: string;
  id: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        id={`faq-button-${id}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${id}`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-content transition-colors hover:text-brand-700 dark:hover:text-brand-300 sm:text-base"
      >
        <span className="flex-1">
          {query.trim() ? highlightMatch(item.question, query) : item.question}
        </span>
        <ChevronIcon
          className={`h-5 w-5 shrink-0 text-content-faint transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>
      <div
        id={`faq-panel-${id}`}
        role="region"
        aria-labelledby={`faq-button-${id}`}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="pb-4 text-sm leading-relaxed text-content-muted sm:text-base"
        >
          {query.trim() ? highlightMatch(item.answer, query) : item.answer}
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [search, setSearch] = useState(initialQuery);
  const [openId, setOpenId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = search.trim().toLowerCase();

  const filteredBySearch = useMemo(() => {
    if (!query) return faqData;
    return faqData.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        faqCategories
          .find((c) => c.id === item.category)
          ?.label.toLowerCase()
          .includes(query),
    );
  }, [query]);

  const groupedFaqs = useMemo(() => {
    const groups: { category: (typeof faqCategories)[0]; items: FaqItem[] }[] = [];
    for (const cat of faqCategories) {
      const items = filteredBySearch.filter((faq) => faq.category === cat.id);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  }, [filteredBySearch]);

  const totalResults = filteredBySearch.length;

  const syncUrl = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      const newUrl = params.toString() ? `?${params.toString()}` : '/faq';
      router.replace(newUrl, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl(value);
    }, 300);
  };

  const handleReset = () => {
    setSearch('');
    setOpenId(null);
    syncUrl('');
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
          Frequently Asked Questions
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
          How can we help?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-content-muted sm:text-lg">
          Answers to common questions about Gravitas Edge, jobs, subscriptions, hiring contacts and
          how the platform works.
        </p>
      </div>

      {/* Search */}
      <div className="relative mt-8">
        <label htmlFor="faq-search" className="sr-only">
          Search frequently asked questions
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon className="h-5 w-5 text-content-faint" />
        </div>
        <input
          ref={searchInputRef}
          id="faq-search"
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search questions, answers or categories..."
          className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-12 text-sm text-content shadow-sm transition placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 sm:text-base"
        />
        {search && (
          <button
            onClick={handleReset}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-content-faint transition-colors hover:text-content"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Result count */}
      {query && (
        <p className="mt-3 text-sm text-content-muted">
          {totalResults} {totalResults === 1 ? 'result' : 'results'} found
          {search && (
            <>
              {' '}
              for <span className="font-medium text-content">&ldquo;{search.trim()}&rdquo;</span>
            </>
          )}
        </p>
      )}

      {/* FAQ List */}
      <div className="mt-8">
        {groupedFaqs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
            <EmptyState
              icon={<SearchIcon className="h-7 w-7" />}
              title="No results found"
              description={`We couldn't find any FAQs matching "${search.trim()}". Try a different search term or browse all questions below.`}
              action={
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-content transition-colors hover:bg-surface-muted"
                >
                  Clear search
                </button>
              }
            />
          </div>
        ) : (
          groupedFaqs.map(({ category, items }) => (
            <section key={category.id} className="mb-6 last:mb-0">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-content-faint sm:text-base">
                {query.trim() ? highlightMatch(category.label, query) : category.label}
              </h2>
              <div className="rounded-2xl border border-line bg-surface px-5 py-1 card-static dark:bg-surface-elevated sm:px-6">
                {items.map((item) => (
                  <FaqAccordionItem
                    key={item.id}
                    item={item}
                    isOpen={openId === item.id}
                    onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                    query={search}
                    id={String(item.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-10 rounded-2xl border border-line bg-surface px-6 py-8 text-center card-static dark:bg-surface-elevated">
        <h3 className="text-base font-semibold text-content sm:text-lg">Still have questions?</h3>
        <p className="mt-2 text-sm text-content-muted">
          Contact the Gravitas Edge team and we will be happy to help.
        </p>
        <a
          href="mailto:enquiry@gravitasedgeconsulting.com"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
