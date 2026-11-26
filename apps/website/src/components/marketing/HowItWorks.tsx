'use client';

import { useEffect, useRef, useState } from 'react';
import Eyebrow from './Eyebrow';

const steps = [
  {
    num: '01',
    tag: 'Free Preview',
    title: 'Explore the Free Preview',
    description: 'See live roles by country and experience before you pay anything.',
  },
  {
    num: '02',
    tag: 'Country Filter',
    title: 'Find relevant countries',
    description: 'Browse the country directory and filter by city, industry and experience.',
  },
  {
    num: '03',
    tag: 'Vault Access',
    title: 'Choose your vault',
    description: 'Pick India, Global, or combined access that matches your experience.',
  },
  {
    num: '04',
    tag: 'Direct Outreach',
    title: 'Reach out directly',
    description: 'Use the contact or application pathway and send your resume.',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setInView(true);
      setActiveIndex(steps.length - 1);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-advance the progress bar across checkpoints 01 -> 04 (pauses on hover)
  useEffect(() => {
    if (!inView || paused) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [inView, paused]);

  const progressPercent = inView ? (activeIndex / (steps.length - 1)) * 100 : 0;

  return (
    <section
      ref={sectionRef}
      id="how"
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#FCFBF7] to-white dark:from-[#0C1E38] dark:via-[#08172E] dark:to-[#0C1E38] py-[76px] scroll-mt-20"
    >
      {/* Anchor for backwards compatibility & header scroll spy */}
      <div id="how-it-works" className="absolute -top-20" aria-hidden="true" />

      <div className="mx-auto max-w-[1180px] px-5">
        <div className="text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-bold tracking-[-0.02em] text-[#061B36] dark:text-[#F2F5FA] text-[clamp(1.7rem,3.4vw,2.5rem)] leading-[1.15] mb-2 font-sans">
            From discovery to direct outreach
          </h2>
          <p className="mx-auto max-w-[540px] text-[0.95rem] text-[#5B6479] dark:text-[#93A3BE]">
            A clear four-step path from previewing live roles to contacting hiring teams directly.
          </p>
        </div>

        {/* Roadmap Progress Container */}
        <div
          className="relative mt-[44px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Desktop Horizontal Progress Bar (aligned cleanly from center of 01 to center of 04) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[21px] hidden h-[4px] overflow-hidden rounded-full bg-[#061B36]/10 dark:bg-white/10 lg:block"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#061B36] via-[#D6952F] to-[#F0C27B] transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Mobile Vertical Progress Bar */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[36px] left-[21px] top-[24px] w-[4px] overflow-hidden rounded-full bg-[#061B36]/10 dark:bg-white/10 lg:hidden"
          >
            <div
              className="w-full rounded-full bg-gradient-to-b from-[#061B36] via-[#D6952F] to-[#F0C27B] transition-all duration-700 ease-out"
              style={{ height: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 lg:gap-[18px]">
            {steps.map((step, idx) => {
              const isCurrent = activeIndex === idx;
              const isCompleted = idx < activeIndex;

              return (
                <div
                  key={step.num}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className="relative flex cursor-pointer items-start gap-4 lg:flex-col lg:items-stretch lg:gap-0"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateY(0)' : 'translateY(22px)',
                    transition: `opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      idx * 140
                    }ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${idx * 140}ms`,
                  }}
                >
                  {/* Checkpoint Node (centered on desktop so the progress line meets every circle dead-center) */}
                  <div className="relative z-10 flex shrink-0 items-center justify-center lg:mb-5 lg:w-full lg:justify-center">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 font-sans text-[0.9rem] font-extrabold transition-all duration-300 ${
                        isCurrent
                          ? 'scale-110 border-[#D6952F] bg-[#061B36] text-[#F6D58A] shadow-[0_0_0_6px_rgba(214,149,47,0.2)] dark:bg-[#D6952F] dark:text-[#061B36]'
                          : isCompleted
                            ? 'border-[#D6952F] bg-[#D6952F] text-[#061B36] shadow-sm'
                            : 'border-[#061B36]/15 bg-white text-[#061B36] shadow-sm dark:border-[#1E3557] dark:bg-[#0F2747] dark:text-[#F0C27B]'
                      }`}
                    >
                      {step.num}
                    </div>
                  </div>

                  {/* Step Card */}
                  <div
                    className={`group relative flex-1 overflow-hidden rounded-[16px] border p-[22px] transition-all duration-300 ${
                      isCurrent
                        ? '-translate-y-1 border-[#D6952F]/55 bg-white shadow-[0_18px_38px_-14px_rgba(6,27,54,0.2)] dark:border-[#F0C27B]/45 dark:bg-[#10294C] dark:shadow-[0_18px_38px_-14px_rgba(0,0,0,0.5)]'
                        : isCompleted
                          ? 'border-[#D6952F]/30 bg-white/95 shadow-[0_10px_28px_-14px_rgba(6,27,54,0.12)] dark:border-[#D6952F]/25 dark:bg-[#0E2342]/90'
                          : 'border-[#E9E5DC] bg-white/90 shadow-[0_10px_28px_-14px_rgba(6,27,54,0.12)] hover:-translate-y-1 hover:border-[#D6952F]/40 dark:border-[#1E3557] dark:bg-[#0C1E38]/90 dark:shadow-none'
                    }`}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider transition-colors ${
                          isCurrent
                            ? 'bg-[#061B36] text-[#F6D58A] dark:bg-[#D6952F] dark:text-[#061B36]'
                            : isCompleted
                              ? 'bg-[#D6952F]/20 text-[#9A6719] dark:text-[#F0C27B]'
                              : 'bg-[#FBF0DE] text-[#9A6719] dark:bg-[#1A3358] dark:text-[#F0C27B]'
                        }`}
                      >
                        {step.tag}
                      </span>
                      <span className="text-xs font-bold text-[#D6952F]/70">
                        Step {step.num}
                      </span>
                    </div>

                    <h3 className="mb-1.5 font-sans text-[1.06rem] font-bold leading-[1.2] text-[#061B36] dark:text-[#F2F5FA]">
                      {step.title}
                    </h3>
                    <p className="text-[0.9rem] leading-[1.55] text-[#5B6479] dark:text-[#93A3BE]">
                      {step.description}
                    </p>

                    {/* Animated bottom accent bar */}
                    <div
                      aria-hidden="true"
                      className={`mt-4 h-[3px] rounded-full bg-gradient-to-r from-[#061B36] via-[#D6952F] to-[#F0C27B] transition-all duration-500 ${
                        isCurrent ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
