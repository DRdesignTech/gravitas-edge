'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  HiSparkles,
  HiShieldCheck,
  HiOutlineBuildingOffice2,
  HiOutlineBriefcase,
  HiOutlineDocumentText,
  HiOutlineUsers,
} from 'react-icons/hi2';
import Eyebrow from '@/components/marketing/Eyebrow';

export interface VendorHeroSlide {
  id: string;
  topic: string;
  badge: string;
  badgeIcon: React.ReactNode;
  titleLeading: string;
  titleHighlight: string;
  subtitle: string;
  bulletPoints: string[];
  ctaPrimary: {
    label: string;
    targetId: string;
  };
  ctaSecondary: {
    label: string;
    targetId: string;
  };
  image: string;
}

export const VENDOR_HERO_SLIDES: VendorHeroSlide[] = [
  {
    id: 'vendor-overview',
    topic: 'Vendor Empanelment',
    badge: 'Enterprise Supplier Access',
    badgeIcon: <HiOutlineBuildingOffice2 className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Win recruitment empanelment and',
    titleHighlight: 'corporate vendor mandates.',
    subtitle:
      'Direct gateway for recruitment agencies, headhunters, and executive search consultancies to discover enterprise empanelment drives, vendor onboarding notices, and corporate talent contracts.',
    bulletPoints: [
      'Verified corporate vendor empanelment notices',
      'Unmasked procurement & talent acquisition contacts',
      'Pre-vetted requirements with clear eligibility criteria',
    ],
    ctaPrimary: {
      label: 'Explore Free Opportunities →',
      targetId: 'free-preview',
    },
    ctaSecondary: {
      label: 'View Access Plans',
      targetId: 'plans',
    },
    image: '/images/new_vault_hero.png',
  },
  {
    id: 'vendor-rfp',
    topic: 'RFPs & Tender Mandates',
    badge: 'Bidding & Tender Pipeline',
    badgeIcon: <HiOutlineDocumentText className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Access high-value RFPs, EOIs and',
    titleHighlight: 'corporate staffing tenders.',
    subtitle:
      'Never miss a competitive bidding cycle. Gain early visibility into corporate requests for proposal (RFPs), expressions of interest (EOIs), and public/private talent acquisition tenders.',
    bulletPoints: [
      'Comprehensive tender scopes, budget & submission dates',
      'Direct procurement pathway with official email disclosures',
      'Multi-industry coverage: IT, Engineering, BFSI & Healthcare',
    ],
    ctaPrimary: {
      label: 'View Tender Pipeline →',
      targetId: 'free-preview',
    },
    ctaSecondary: {
      label: 'Explore Key Areas',
      targetId: 'key-areas',
    },
    image: '/images/vendor_slide_tender_board.jpg',
  },
  {
    id: 'vendor-staffing',
    topic: 'Staffing & Contingent RPO',
    badge: 'Volume Workforce Partnerships',
    badgeIcon: <HiSparkles className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Scale your contingent staffing and',
    titleHighlight: 'managed services portfolio.',
    subtitle:
      'Connect with Fortune 500 corporations, high-growth tech firms, and multinational GCCs seeking contingent workforce suppliers, managed service providers (MSP), and dedicated RPO partners.',
    bulletPoints: [
      'High-volume contingent staffing requisitions',
      'Contract-to-hire & flexible payroll partnerships',
      'Automated expiry management ensuring 100% active mandates',
    ],
    ctaPrimary: {
      label: 'Compare Access Plans →',
      targetId: 'plans',
    },
    ctaSecondary: {
      label: 'Explore Mandates',
      targetId: 'free-preview',
    },
    image: '/images/refer_earn_hero_bg.jpg',
  },
  {
    id: 'vendor-search',
    topic: 'Executive Search Mandates',
    badge: 'Leadership & C-Suite Retainers',
    badgeIcon: <HiShieldCheck className="w-4 h-4 text-[#F0C27B]" />,
    titleLeading: 'Retained executive search and',
    titleHighlight: 'exclusive leadership mandates.',
    subtitle:
      'Confidential board-level and C-suite retained mandates directly from corporate boards and HR leadership looking for specialized boutique executive search firms across India & Global hubs.',
    bulletPoints: [
      'Exclusive CXO & VP-level retained search briefs',
      'Direct board & CHRO liaison contacts',
      'Zero agency intermediary markups or bidding dilution',
    ],
    ctaPrimary: {
      label: 'Unlock Vendor Access →',
      targetId: 'plans',
    },
    ctaSecondary: {
      label: 'Frequently Asked Questions',
      targetId: 'faq',
    },
    image: '/images/vendor_slide_agency_meeting.jpg',
  },
];

interface VendorHeroCarouselProps {
  publishedCount: number;
  loading: boolean;
  scrollToId: (id: string) => void;
}

export default function VendorHeroCarousel({
  publishedCount,
  loading,
  scrollToId,
}: VendorHeroCarouselProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % VENDOR_HERO_SLIDES.length);
  }, []);

  // When user clicks on hero category tabs, pause for 3s then automatically resume
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

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  // Auto-rotate every 1.5 seconds in a continuous circular loop
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const slide = VENDOR_HERO_SLIDES[currentSlideIndex];
  const nextSlideIndex = (currentSlideIndex + 1) % VENDOR_HERO_SLIDES.length;
  const nextSlideData = VENDOR_HERO_SLIDES[nextSlideIndex];

  return (
    <section
      id="home"
      aria-label="Recruitment Vendor Hero Carousel"
      className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden bg-[#061B36] text-white pt-[96px] pb-[104px] max-[900px]:pt-[76px] max-[900px]:pb-[96px] isolate"
    >
      {/* Background Images Layer with horizontal scroll/slide animation - framed on right side like Home hero */}
      {VENDOR_HERO_SLIDES.map((s, index) => {
        const isActive = index === currentSlideIndex;
        const isPrev =
          index === (currentSlideIndex - 1 + VENDOR_HERO_SLIDES.length) % VENDOR_HERO_SLIDES.length;

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

      {/* Gradient Scrims matching Home Hero: left-anchored navy so the text is 100% readable and image breathes on the right */}
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

      {/* Main Container - aligned with Header (max-w-[1320px] px-5) */}
      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-5">
        {/* Slide Navigation Category Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {VENDOR_HERO_SLIDES.map((s, idx) => (
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

        {/* Dynamic Slide Content with Horizontal Scroll Animation */}
        <div key={slide.id} className="hero-slide-scroll max-w-3xl text-left">
          <div className="flex items-center gap-2 mb-2">
            {slide.badgeIcon}
            <span className="text-[0.78rem] font-bold tracking-[0.14em] uppercase text-[#F0C27B]">
              {slide.badge}
            </span>
          </div>

          <h1 className="text-white font-bold tracking-[-0.02em] leading-[1.15] text-[clamp(2.1rem,4.8vw,3.6rem)]">
            {slide.titleLeading}{' '}
            <span className="text-[#C8943E]">{slide.titleHighlight}</span>
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:mt-5 sm:text-lg lg:mt-6 lg:text-xl">
            {slide.subtitle}
          </p>

          {/* Quick bullet points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-[720px] mt-4 mb-6">
            {slide.bulletPoints.map((point, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white/[0.08] backdrop-blur-sm border border-white/15 rounded-lg px-2.5 py-1.5 text-[0.8rem] text-slate-200"
              >
                <span className="text-[#D6952F] font-bold">✓</span>
                <span className="leading-snug">{point}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => scrollToId(slide.ctaPrimary.targetId)}
              className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-b from-[#D3A24C] to-[#B8832F] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(200,148,62,0.75)] ring-1 ring-inset ring-white/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#DBAA55] hover:to-[#C08A32] hover:shadow-[0_18px_40px_-14px_rgba(200,148,62,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#061B36] focus-visible:ring-offset-2 sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base cursor-pointer"
            >
              {slide.ctaPrimary.label}
              <span
                aria-hidden="true"
                className="btn-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              />
            </button>
            <button
              type="button"
              onClick={() => scrollToId(slide.ctaSecondary.targetId)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03070C] sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base cursor-pointer"
            >
              {slide.ctaSecondary.label}
            </button>
          </div>

          {!loading && publishedCount > 0 && (
            <p className="mt-5 text-sm text-white/70">
              <span className="font-semibold text-[#E3B968]">{publishedCount}</span>{' '}
              {publishedCount === 1 ? 'opportunity' : 'opportunities'} currently listed
            </p>
          )}
        </div>

       
      </div>
    </section>
  );
}
