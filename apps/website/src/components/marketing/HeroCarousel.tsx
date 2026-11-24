'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HiSparkles, HiChevronLeft, HiChevronRight, HiArrowRight, HiShieldCheck, HiOutlineBuildingOffice2, HiOutlineUserGroup, HiOutlineGlobeAmericas } from 'react-icons/hi2';

export interface HeroSlide {
  id: string;
  badge: string;
  badgeIcon?: React.ReactNode;
  topic: string; // e.g. "Platform Overview", "How It Works", "Core Features", "Candidate Benefits"
  titleLeading: string;
  titleHighlight: string;
  subtitle: string;
  bulletPoints: string[];
  ctaPrimary: {
    label: string;
    href: string;
  };
  ctaSecondary?: {
    label: string;
    href: string;
  };
  image: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'global-overview',
    topic: 'Global Platform Overview',
    badge: 'Curated Cross-Border Career Vaults',
    badgeIcon: <HiOutlineGlobeAmericas className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Find opportunities across borders.',
    titleHighlight: 'Before they reach the usual job portals.',
    subtitle:
      'Gravitas Edge connects ambitious professionals directly with unadvertised, confidential leadership roles and multinational vacancies across 24+ countries.',
    bulletPoints: [
      'Pre-vetted cross-border opportunities',
      'Exclusive India, UAE, UK, & Global hubs',
      'Direct hiring manager application pathways',
    ],
    ctaPrimary: {
      label: 'Explore Free Preview →',
      href: '#free-preview',
    },
    ctaSecondary: {
      label: 'See Vaults & Pricing',
      href: '#vaults',
    },
    image: '/images/hero_slide_global.jpg',
  },
  {
    id: 'how-it-works',
    topic: 'How It Works & Process',
    badge: 'Transparent 4-Step Career Progression',
    badgeIcon: <HiSparkles className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'From instant discovery',
    titleHighlight: 'to direct hiring manager outreach.',
    subtitle:
      'Preview real listings for free, filter by your target country and experience tier, unlock targeted regional vaults, and bypass noisy job boards with verified direct contact points.',
    bulletPoints: [
      '1. Free Preview live roles before subscribing',
      '2. Filter by 60+ cities & specific seniority tiers',
      '3. Unlock contact details and submit directly',
    ],
    ctaPrimary: {
      label: 'See How It Works →',
      href: '#how',
    },
    ctaSecondary: {
      label: 'Explore Country Directory',
      href: '#country-directory',
    },
    image: '/images/hero_redesign.jpg',
  },
  {
    id: 'core-features',
    topic: 'Platform Features & Vaults',
    badge: 'Curated Vaults & AI Assistance',
    badgeIcon: <HiOutlineBuildingOffice2 className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Intelligent career tools built',
    titleHighlight: 'for high-impact talent.',
    subtitle:
      'Explore country-level directories, interactive world maps, real-time job filters, 24/7 AI navigation assistance, and one-click CV review to accelerate your global placements.',
    bulletPoints: [
      'Real-time country & industry directory with interactive map',
      'Interactive AI chatbot guidance & instant FAQ answers',
      'Automated expiry removal — only 100% active roles',
    ],
    ctaPrimary: {
      label: 'Find Your Vault →',
      href: '#vaults',
    },
    ctaSecondary: {
      label: 'Explore Live Roles',
      href: '/opportunities',
    },
    image: '/images/hero_slide_features.jpg',
  },
  {
    id: 'candidate-benefits',
    topic: 'Candidate Benefits & Value',
    badge: 'Premier Executive Advantage',
    badgeIcon: <HiShieldCheck className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Skip the recruiter black hole.',
    titleHighlight: 'Gain direct access to decision-makers.',
    subtitle:
      'Save months of aimless applications. One single membership gives you unmasked recruiter emails, tax-free compensation packages in UAE, and global relocation intelligence.',
    bulletPoints: [
      'No third-party recruiter spam or stale listings',
      'Tax-free comp & relocation opportunities',
      'Up to 20% bundle savings with multi-region access',
    ],
    ctaPrimary: {
      label: 'Unlock Executive Access →',
      href: '#bundle',
    },
    ctaSecondary: {
      label: 'Read Member Reviews',
      href: '#testimonials',
    },
    image: '/images/hero_slide_benefits.jpg',
  },
];

interface HeroCarouselProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCountry: string;
  setSelectedCountry: (val: string) => void;
  handleHeroSearch: (e: React.FormEvent) => void;
  countriesList: { name: string; code: string; flag: string }[];
  countryCounts: Record<string, number>;
  handleCountryClick: (name: string) => void;
  oppsTotal: number;
  countriesCount: number;
  citiesCount: number;
  scrollTo: (id: string) => void;
}

export default function HeroCarousel({
  searchQuery,
  setSearchQuery,
  selectedCountry,
  setSelectedCountry,
  handleHeroSearch,
  countriesList,
  countryCounts,
  handleCountryClick,
  oppsTotal,
  countriesCount,
  citiesCount,
  scrollTo,
}: HeroCarouselProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // When user clicks on hero section category tabs, pause for 3s then automatically resume
  const handleTabClick = (idx: number) => {
    setCurrentSlideIndex(idx);
    setIsPaused(true);

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }

    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 3000);
  };

  // Clean up any pending pause timer on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  // Auto-rotate every 1.5 seconds in a continuous circular loop
  // Never pauses for mouse hover or any other page interactions,
  // except when the user explicitly clicks a category tab (which pauses for 3s).
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const slide = HERO_SLIDES[currentSlideIndex];
  const nextSlideIndex = (currentSlideIndex + 1) % HERO_SLIDES.length;
  const nextSlideData = HERO_SLIDES[nextSlideIndex];

  return (
    <section
      id="home"
      aria-label="Hero Carousel"
      className="relative bg-[#061B36] text-white pt-[90px] pb-[104px] max-[900px]:pt-[72px] max-[900px]:pb-[96px] overflow-hidden isolate"
    >
      {/* Background Images Layer with horizontal scroll/slide animation */}
      {HERO_SLIDES.map((s, index) => {
        const isActive = index === currentSlideIndex;
        // Determine whether this slide is active, upcoming (to the right), or previous (to the left)
        const isPrev = (index === (currentSlideIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
        
        return (
          <div
            key={s.id}
            aria-hidden="true"
            className={`pointer-events-none absolute top-0 right-0 bottom-0 w-[72%] max-[900px]:w-full z-[-2] bg-cover bg-no-repeat transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isActive
                ? 'opacity-100 translate-x-0 scale-100'
                : isPrev
                ? 'opacity-0 -translate-x-20 scale-105 pointer-events-none'
                : 'opacity-0 translate-x-20 scale-95 pointer-events-none'
            } [background-position:center_30%] max-[900px]:[background-position:70%_30%]`}
            style={{
              backgroundImage: `url(${s.image})`,
            }}
          />
        );
      })}

      {/* Gradient Scrims for text contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[-1] hidden min-[901px]:block"
        style={{
          background:
            'linear-gradient(90deg, #061B36 0%, #061B36 42%, rgba(6,27,54,0.85) 54%, rgba(6,27,54,0.3) 72%, rgba(6,27,54,0) 100%), linear-gradient(0deg, rgba(6,27,54,0.65), rgba(6,27,54,0) 40%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[-1] min-[901px]:hidden block"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,27,54,0.94), rgba(6,27,54,0.75)), linear-gradient(0deg, #061B36, rgba(6,27,54,0) 40%)',
        }}
      />

      {/* Main Container - aligned exactly with Header (max-w-[1320px] px-5) */}
      <div className="relative mx-auto max-w-[1320px] px-5">
        {/* Slide Navigation Category Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {HERO_SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleTabClick(idx)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                idx === currentSlideIndex
                  ? 'bg-[#D6952F] text-[#061B36] shadow-[0_4px_12px_rgba(214,149,47,0.35)]'
                  : 'bg-white/10 hover:bg-white/20 text-[#C9D3EA] border border-white/10'
              }`}
            >
              <span>{s.topic}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Eyebrow Badge & Content with Vertical Scroll Animation */}
        <div key={slide.id} className="hero-slide-scroll">
          <div className="flex items-center gap-2 mb-[0.6rem]">
            {slide.badgeIcon}
            <span className="text-[0.78rem] font-bold tracking-[0.14em] uppercase text-[#F0C27B]">
              {slide.badge}
            </span>
          </div>

          <h1 className="text-white font-bold tracking-[-0.02em] leading-[1.15] text-[clamp(2.1rem,4.8vw,3.5rem)] max-w-[800px]">
            {slide.titleLeading}{' '}
            <em className="not-italic text-[#D6952F]">{slide.titleHighlight}</em>
          </h1>

          {/* Subtitle */}
          <p className="text-[#C9D3EA] text-[1.1rem] leading-[1.55] max-w-[640px] mt-[16px] mb-[18px]">
            {slide.subtitle}
          </p>

          {/* Quick bullet highlights of features/benefits/working */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-[720px] mb-[24px]">
            {slide.bulletPoints.map((point, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 text-[0.8rem] text-slate-200"
              >
                <span className="text-[#D6952F] font-bold">✓</span>
                <span className="leading-snug">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Persistent Search bar form */}
        <form
          onSubmit={handleHeroSearch}
          className="flex flex-col min-[641px]:flex-row gap-2 bg-white rounded-[18px] min-[641px]:rounded-full p-1.5 max-w-[680px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]"
          id="heroSearch"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Job title, keyword, function or Job ID"
            aria-label="Keyword or Job ID"
            className="flex-1 border-0 font-sans text-base py-2.5 px-3.5 outline-none text-[#1A2236] bg-transparent min-w-0 placeholder:text-[#5B6479]"
          />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            aria-label="Country"
            className="border-0 border-t min-[641px]:border-t-0 min-[641px]:border-l border-[#E9E5DC] font-sans text-base py-2.5 px-3.5 outline-none text-[#1A2236] bg-transparent min-w-0 max-w-none min-[641px]:max-w-[190px] cursor-pointer"
          >
            <option value="">All countries</option>
            {countriesList.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 border-0 rounded-full py-3 px-6 font-bold text-[0.95rem] leading-none bg-[#D6952F] hover:bg-[#E0A85A] text-[#061B36] hover:shadow-[0_8px_24px_-6px_rgba(200,132,45,0.45)] hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* Hero Stats */}
        <div className="flex flex-wrap items-center gap-7 mt-[28px]">
          <div>
            <b className="block text-[1.8rem] text-[#86EFAC] font-bold font-sans leading-tight">
              {oppsTotal > 0 ? oppsTotal : '500+'}
            </b>
            <span className="text-[#AEB9D6] text-[0.85rem]">live opportunities</span>
          </div>
          <div>
            <b className="block text-[1.8rem] text-[#86EFAC] font-bold font-sans leading-tight">
              {countriesCount > 0 ? countriesCount : '24'}
            </b>
            <span className="text-[#AEB9D6] text-[0.85rem]">countries represented</span>
          </div>
          <div>
            <b className="block text-[1.8rem] text-[#86EFAC] font-bold font-sans leading-tight">
              {citiesCount > 0 ? citiesCount : '60+'}
            </b>
            <span className="text-[#AEB9D6] text-[0.85rem]">cities</span>
          </div>
        </div>

        {/* Country Pills Row */}
        <div className="mt-[22px] flex flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 max-w-full">
          {countriesList
            .filter((c) => c.code !== 'IN')
            .slice(0, 8)
            .map((c) => {
              const count = countryCounts[c.name];
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountryClick(c.name)}
                  className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 bg-[rgba(34,197,94,0.14)] hover:bg-white/[0.18] border border-[rgba(134,239,172,0.55)] text-white rounded-full py-1.5 px-3 text-[0.82rem] font-semibold transition-colors cursor-pointer"
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                  {count ? <span>· {count}</span> : null}
                </button>
              );
            })}
        </div>

        {/* CTA Buttons Row */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3 flex-wrap">
            <Link
              href={slide.ctaPrimary.href}
              onClick={(e) => {
                if (slide.ctaPrimary.href.startsWith('#')) {
                  e.preventDefault();
                  const target = slide.ctaPrimary.href.replace('#', '');
                  scrollTo(target);
                  window.history.replaceState(null, '', slide.ctaPrimary.href);
                }
              }}
              className="inline-flex items-center justify-center gap-2 border-0 rounded-full py-3 px-6 font-bold text-[0.95rem] leading-none bg-[#D6952F] hover:bg-[#E0A85A] text-[#061B36] hover:shadow-[0_8px_24px_-6px_rgba(200,132,45,0.45)] hover:-translate-y-0.5 transition-all no-underline cursor-pointer"
            >
              {slide.ctaPrimary.label}
            </Link>

            {slide.ctaSecondary && (
              <Link
                href={slide.ctaSecondary.href}
                onClick={(e) => {
                  const href = slide.ctaSecondary?.href;
                  if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const target = href.replace('#', '');
                    scrollTo(target);
                    window.history.replaceState(null, '', href);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 font-bold text-[0.95rem] leading-none bg-transparent hover:bg-white/[0.08] text-white border border-white/30 hover:border-white transition-all no-underline cursor-pointer"
              >
                {slide.ctaSecondary.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
