'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { faqData, faqCategories } from '@/data/faq-data';
import type { FaqItem, FaqCategory } from '@/data/faq-data';
import { EmptyState } from '@/components/ui';

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="rounded bg-[#FFE8A3] text-[#061B36] font-semibold dark:bg-[#D6952F]/40 dark:text-[#F0C27B] px-1 py-0.2"
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
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function HelpIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.451 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CategoryIcon({ categoryId, className = 'h-4 w-4' }: { categoryId: string; className?: string }) {
  switch (categoryId) {
    case 'about-gravitas-edge':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
    case 'opportunity-vaults':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case 'jobs-and-opportunities':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      );
    case 'subscription-and-payment':
    case 'payments':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      );
    case 'international-opportunities':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      );
    case 'applications-and-employers':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      );
    case 'transparency':
    case 'getting-the-most-value':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      );
    case 'legal-and-policies':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.451 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
  query,
  categoryLabel,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  query: string;
  categoryLabel?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={`group rounded-2xl border transition-all duration-200 ${
        isOpen
          ? 'border-[#D6952F]/60 bg-white shadow-md ring-1 ring-[#D6952F]/20 dark:border-[#D6952F]/50 dark:bg-[#0E2340] dark:ring-0'
          : 'border-[#E9E5DC] bg-white hover:border-[#D6952F]/40 hover:shadow-sm dark:border-[#1E3557] dark:bg-[#0A1E37]'
      }`}
    >
      <button
        id={`faq-button-${item.id}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${item.id}`}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors sm:p-6"
      >
        <div className="flex-1 min-w-0">
          {categoryLabel && (
            <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-wider text-[#15803D] dark:text-emerald-400">
              {categoryLabel}
            </span>
          )}
          <h3 className="text-[15px] sm:text-[16px] font-bold text-[#061B36] group-hover:text-[#C8842D] dark:text-white dark:group-hover:text-[#F0C27B] transition-colors leading-snug">
            {query.trim() ? highlightMatch(item.question, query) : item.question}
          </h3>
        </div>
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[1.2rem] font-medium leading-none transition-all duration-200 ${
            isOpen
              ? 'bg-[#061B36] text-[#D6952F] dark:bg-[#1D3B66]'
              : 'bg-[#F4F6F9] text-[#5B6479] group-hover:bg-[#FFF3D9] group-hover:text-[#061B36] dark:bg-[#152943] dark:text-slate-300 dark:group-hover:bg-[#1E3A60]'
          }`}
        >
          {isOpen ? '–' : '+'}
        </span>
      </button>

      <div
        id={`faq-panel-${item.id}`}
        role="region"
        aria-labelledby={`faq-button-${item.id}`}
        className="overflow-hidden transition-[height] duration-250 ease-in-out"
        style={{ height: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="border-t border-[#E9E5DC]/80 px-5 pb-5 pt-4 text-[14px] sm:text-[15px] leading-relaxed text-[#4A5568] dark:border-[#1E3557] dark:text-slate-300 sm:px-6 sm:pb-6"
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
  const initialCategory = searchParams.get('category') || 'all';

  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const questionsRef = useRef<HTMLElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = search.trim().toLowerCase();

  const scrollToQuestionsTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (questionsRef.current) {
      const headerOffset = 90;
      const elementPosition = questionsRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    }
  }, []);

  // Filter FAQs based on search query
  const searchResults = useMemo(() => {
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

  // Group filtered results by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of faqCategories) {
      counts[cat.id] = searchResults.filter((f) => f.category === cat.id).length;
    }
    return counts;
  }, [searchResults]);

  // Active items to display in the main content area
  const activeItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return searchResults;
    }
    return searchResults.filter((item) => item.category === selectedCategory);
  }, [searchResults, selectedCategory]);

  const activeCategoryMeta = useMemo(() => {
    return faqCategories.find((c) => c.id === selectedCategory) || null;
  }, [selectedCategory]);

  // Grouped by category when viewing "all"
  const groupedSections = useMemo(() => {
    const groups: { category: FaqCategory; items: FaqItem[] }[] = [];
    for (const cat of faqCategories) {
      const items = searchResults.filter((faq) => faq.category === cat.id);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  }, [searchResults]);

  const totalResults = searchResults.length;

  // URL synchronization
  const syncUrl = useCallback(
    (newSearch: string, newCat: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSearch) {
        params.set('q', newSearch);
      } else {
        params.delete('q');
      }
      if (newCat && newCat !== 'all') {
        params.set('category', newCat);
      } else {
        params.delete('category');
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
      syncUrl(value, selectedCategory);
    }, 300);
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setOpenIds(new Set()); // reset open states when switching category
    syncUrl(search, catId);
    scrollToQuestionsTop();
  };

  const handleResetSearch = () => {
    setSearch('');
    syncUrl('', selectedCategory);
    searchInputRef.current?.focus();
  };

  const handleToggleAccordion = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setOpenIds(new Set(activeItems.map((item) => item.id)));
  };

  const handleCollapseAll = () => {
    setOpenIds(new Set());
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]">
      {/* ─────────────────────────────────────────────────────────────
          1. HIGH-IMPACT HERO & SEARCH HEADER
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#082245] to-[#0A2A54] pb-14 pt-16 sm:pb-16 sm:pt-20 text-white isolate">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#D6952F]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]"
        />

        <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#F0C27B] backdrop-blur-md shadow-sm">
            <HelpIcon className="h-4 w-4 text-[#D6952F]" />
            Knowledge Base &amp; FAQ
          </div>

          {/* Heading */}
          <h1 className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            How can we help you?
          </h1>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-[#C9D3EA]">
            Explore verified answers about Opportunity Vaults, direct hiring contacts,
            international job listings, and membership plans.
          </p>

          {/* Search Box */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative flex items-center rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 dark:bg-[#0E2340] dark:ring-white/10">
              <label htmlFor="faq-search" className="sr-only">
                Search frequently asked questions
              </label>
              <div className="pointer-events-none pl-3 text-[#5B6479] dark:text-slate-400">
                <SearchIcon className="h-5 w-5" />
              </div>
              <input
                ref={searchInputRef}
                id="faq-search"
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search questions, keywords (e.g. refund, UAE, direct contacts, pricing)..."
                className="w-full bg-transparent px-3 py-2 text-sm sm:text-base font-medium text-[#061B36] placeholder-[#8C9AC0] focus:outline-none dark:text-white dark:placeholder-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  aria-label="Clear search"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#5B6479] transition-colors hover:bg-slate-100 hover:text-[#061B36] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white mr-1"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick stats pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-[#A8B7DC]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                {totalResults} Questions
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                14 Topics
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                Direct Hiring Contacts
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                100% Verified Data
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT (QUESTIONS ON LEFT, SIDEBAR ON RIGHT)
          ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        {/* Mobile Topic Scroller (Visible only on < lg screens) */}
        <div className="mb-6 block lg:hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400">
              Browse by Topic
            </span>
            <span className="text-xs text-[#061B36] dark:text-[#F0C27B] font-semibold">
              {selectedCategory === 'all' ? 'All Questions' : activeCategoryMeta?.label}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => handleCategorySelect('all')}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#1D3B66]'
                  : 'bg-white text-[#5B6479] border border-[#E9E5DC] dark:bg-[#0E2340] dark:border-[#1E3557] dark:text-slate-300'
              }`}
            >
              All Topics ({totalResults})
            </button>
            {faqCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#1D3B66]'
                    : 'bg-white text-[#5B6479] border border-[#E9E5DC] dark:bg-[#0E2340] dark:border-[#1E3557] dark:text-slate-300'
                }`}
              >
                {cat.label} ({categoryCounts[cat.id] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] items-start">
          {/* ═════════════════════════════════════════════════════════
              LEFT COLUMN: QUESTIONS & ACCORDIONS
              ═════════════════════════════════════════════════════════ */}
          <main ref={questionsRef} id="faq-questions" className="min-w-0 scroll-mt-24">
            {/* Top Bar for Questions: Title & Expand/Collapse Toggle */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E5DC] pb-4 dark:border-[#1E3557]">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#061B36] dark:text-white">
                  {query
                    ? `Search Results`
                    : selectedCategory === 'all'
                    ? 'All Questions'
                    : activeCategoryMeta?.label}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400">
                  {query ? (
                    <>
                      Found <strong className="text-[#061B36] dark:text-white">{activeItems.length}</strong> matching questions for &ldquo;{search}&rdquo;
                    </>
                  ) : (
                    <>Showing {activeItems.length} questions answered</>
                  )}
                </p>
              </div>

              {activeItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    className="rounded-lg border border-[#E9E5DC] bg-white px-2.5 py-1 text-xs font-semibold text-[#061B36] shadow-2xs hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-200 dark:hover:bg-[#152E50]"
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="rounded-lg border border-[#E9E5DC] bg-white px-2.5 py-1 text-xs font-semibold text-[#061B36] shadow-2xs hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-200 dark:hover:bg-[#152E50]"
                  >
                    Collapse all
                  </button>
                </div>
              )}
            </div>

            {/* Questions Container */}
            {activeItems.length === 0 ? (
              <div className="rounded-2xl border border-[#E9E5DC] bg-white p-8 text-center shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
                <EmptyState
                  icon={<SearchIcon className="h-8 w-8 text-[#5B6479]" />}
                  title="No questions found"
                  description={
                    query
                      ? `We couldn't find any FAQs matching "${search}". Try searching for another term like "vault", "contact", or "pricing".`
                      : 'No questions currently available in this section.'
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        handleResetSearch();
                        handleCategorySelect('all');
                      }}
                      className="rounded-xl bg-[#061B36] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#10243E] dark:bg-[#1D3B66]"
                    >
                      Reset &amp; View All Questions
                    </button>
                  }
                />
              </div>
            ) : selectedCategory === 'all' && !query ? (
              /* When in "All" view with no search, display grouped by Section Heading */
              <div className="space-y-10">
                {groupedSections.map(({ category, items }) => (
                  <section key={category.id} id={category.id} className="scroll-mt-24">
                    <div className="mb-3.5 flex items-center justify-between border-b border-[#E9E5DC]/70 pb-2 dark:border-[#1E3557]/70">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E9E5DC]/50 text-[#061B36] dark:bg-[#1E3557] dark:text-white">
                          <CategoryIcon categoryId={category.id} className="h-4 w-4 text-[#D6952F]" />
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
                          {category.label}
                        </h3>
                      </div>
                      <span className="rounded-full bg-[#F4F6F9] px-2.5 py-0.5 text-xs font-semibold text-[#5B6479] dark:bg-[#152943] dark:text-slate-400">
                        {items.length} questions
                      </span>
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => (
                        <FaqAccordionItem
                          key={item.id}
                          item={item}
                          isOpen={openIds.has(item.id)}
                          onToggle={() => handleToggleAccordion(item.id)}
                          query={search}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Specific Category view or Active Search Results */
              <div className="space-y-3">
                {activeItems.map((item) => {
                  const cat = faqCategories.find((c) => c.id === item.category);
                  return (
                    <FaqAccordionItem
                      key={item.id}
                      item={item}
                      isOpen={openIds.has(item.id)}
                      onToggle={() => handleToggleAccordion(item.id)}
                      query={search}
                      categoryLabel={selectedCategory === 'all' ? cat?.label : undefined}
                    />
                  );
                })}
              </div>
            )}

            {/* Bottom Support Callout */}
            <div className="mt-12 rounded-2xl border border-[#E9E5DC] bg-gradient-to-br from-white via-[#FCFAF6] to-[#F7EFE2]/60 p-6 sm:p-8 shadow-sm dark:border-[#1E3557] dark:from-[#0E2340] dark:via-[#0E2340] dark:to-[#0B1C34]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div>
                  <h3 className="text-lg font-bold text-[#061B36] dark:text-white">
                    Didn&apos;t find what you were looking for?
                  </h3>
                  <p className="mt-1 text-sm text-[#5B6479] dark:text-slate-300">
                    Our candidate advisory team is here to assist with any questions about vaults, plans, or hiring contacts.
                  </p>
                </div>
                <a
                  href="mailto:enquiry@gravitasedgeconsulting.com"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#061B36] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#10243E] hover:-translate-y-0.5 dark:bg-[#1D3B66] dark:hover:bg-[#26497C]"
                >
                  <HelpIcon className="h-4 w-4 text-[#D6952F]" />
                  Contact Support
                </a>
              </div>
            </div>
          </main>

          {/* ═════════════════════════════════════════════════════════
              RIGHT COLUMN: TOPIC SIDEBAR (STICKY ON DESKTOP)
              ═════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-[#E9E5DC] pb-3 dark:border-[#1E3557]">
                <div>
                  <h3 className="font-bold text-[#061B36] dark:text-white text-base">
                    FAQ Topics
                  </h3>
                  <p className="text-[11px] text-[#5B6479] dark:text-slate-400">
                    Filter questions by section
                  </p>
                </div>
                <span className="rounded-full bg-[#FFF3D9] px-2 py-0.5 text-[11px] font-bold text-[#061B36] dark:bg-[#D6952F]/20 dark:text-[#F0C27B]">
                  14 Topics
                </span>
              </div>

              {/* Category Navigation Tabs */}
              <nav className="mt-3.5 max-h-[calc(100vh-18rem)] space-y-1 overflow-y-auto pr-1 text-sm scrollbar-thin">
                {/* "All Topics" Tab */}
                <button
                  type="button"
                  onClick={() => handleCategorySelect('all')}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#1D3B66]'
                      : 'text-[#1A2236] hover:bg-[#F4F6F9] dark:text-slate-300 dark:hover:bg-[#152943]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10">
                      ★
                    </span>
                    <span className="truncate">All Questions</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F4F6F9] text-[#5B6479] dark:bg-[#152943] dark:text-slate-400'
                    }`}
                  >
                    {totalResults}
                  </span>
                </button>

                {/* Individual Category Tabs */}
                {faqCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts[cat.id] ?? 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#1D3B66]'
                          : 'text-[#4A5568] hover:bg-[#F4F6F9] dark:text-slate-300 dark:hover:bg-[#152943]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="shrink-0 text-[#D6952F]">
                          <CategoryIcon categoryId={cat.id} className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{cat.label}</span>
                      </div>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[#F4F6F9] text-[#5B6479] dark:bg-[#152943] dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar Help Card */}
              <div className="mt-4 border-t border-[#E9E5DC] pt-4 dark:border-[#1E3557]">
                <div className="rounded-xl bg-[#F7EFE2]/70 p-3.5 text-center dark:bg-[#152943]">
                  <p className="text-xs font-bold text-[#061B36] dark:text-white">
                    Need Personalized Help?
                  </p>
                  <p className="mt-1 text-[11px] text-[#5B6479] dark:text-slate-300">
                    Speak directly with our team regarding memberships or job vaults.
                  </p>
                  <Link
                    href="/contact"
                    className="mt-2.5 inline-block w-full rounded-lg bg-[#061B36] py-1.5 text-center text-xs font-semibold text-white shadow-sm hover:bg-[#10243E] dark:bg-[#1D3B66]"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
