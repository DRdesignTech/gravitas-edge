'use client';

import { useState, type MouseEvent } from 'react';
import ScrollReveal from '@/components/marketing/ScrollReveal';

interface AdvantageItem {
  id: 'contacts' | 'premarket' | 'mobility';
  number: string;
  tag: string;
  title: string;
  description: string;
  footerPill: string;
}

const ADVANTAGE_ITEMS: AdvantageItem[] = [
  {
    id: 'contacts',
    number: '01',
    tag: 'Direct Routing',
    title: 'Direct Hiring Contacts',
    description:
      'Each opportunity includes validated decision-maker contact details — name, title, and verified email route — so your inquiry reaches the actual hiring authority.',
    footerPill: 'Name, Title & Verified Email',
  },
  {
    id: 'premarket',
    number: '02',
    tag: 'Early Access',
    title: 'Pre-Market & Retained Searches',
    description:
      'Discover roles sourced directly from executive search partners and confidential institutional mandates before they are publicly broadcast.',
    footerPill: 'Unadvertised Mandates',
  },
  {
    id: 'mobility',
    number: '03',
    tag: 'Global Reach',
    title: 'Cross-Border Global Mobility',
    description:
      'Target leadership and executive mandates across high-growth international corridors including India, UAE, Singapore, the UK, and Europe.',
    footerPill: 'India · UAE · SG · UK · EU',
  },
];

function AnimatedAdvantageIcon({ id, hovered }: { id: AdvantageItem['id']; hovered: boolean }) {
  if (id === 'contacts') {
    return (
      <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061B36] to-[#11315B] text-[#F0C27B] shadow-md ring-1 ring-[#D6952F]/30">
        {/* Expanding verification pulse ring */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-2xl border border-[#F0C27B]/40 transition-transform duration-700 ${
            hovered ? 'scale-125 opacity-0' : 'animate-pulse scale-105 opacity-40'
          }`}
        />
        {/* Live verified indicator dot */}
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#061B36] bg-emerald-400" />
        </span>
        <svg
          className={`h-6 w-6 transition-transform duration-500 ${
            hovered ? 'scale-110 -translate-y-0.5' : 'animate-[floatSlow_3.2s_ease-in-out_infinite]'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.85}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
    );
  }

  if (id === 'premarket') {
    return (
      <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061B36] to-[#11315B] text-[#F0C27B] shadow-md ring-1 ring-[#D6952F]/30">
        {/* Electric aura */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-2xl bg-[#D6952F]/20 blur-md transition-opacity duration-300 ${
            hovered ? 'opacity-100' : 'animate-pulse opacity-40'
          }`}
        />
        <svg
          className={`relative h-6 w-6 transition-all duration-300 ${
            hovered
              ? 'scale-120 -rotate-6 text-[#FFE09E] drop-shadow-[0_0_8px_rgba(240,194,123,0.8)]'
              : 'animate-[zapPulse_2.6s_ease-in-out_infinite]'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.9}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061B36] to-[#11315B] text-[#F0C27B] shadow-md ring-1 ring-[#D6952F]/30">
      {/* Orbiting dashed ring */}
      <svg
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] text-[#D6952F]/50 ${
          hovered ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'
        }`}
        viewBox="0 0 60 60"
        fill="none"
      >
        <circle
          cx="30"
          cy="30"
          r="27"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="5 5"
        />
      </svg>
      <svg
        className={`relative h-6 w-6 transition-transform duration-700 ${
          hovered ? 'rotate-45 scale-110' : 'animate-[spin_18s_linear_infinite]'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.85}
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3a13.5 13.5 0 010 18M12 3a13.5 13.5 0 000 18"
        />
      </svg>
    </div>
  );
}

function AdvantageCard3D({ item, index }: { item: AdvantageItem; index: number }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 9,
      ry: (px - 0.5) * 9,
      gx: px * 100,
      gy: py * 100,
      hovered: true,
    });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });
  }

  return (
    <ScrollReveal delay={index * 100} className="h-full">
      <div style={{ perspective: '1100px' }} className="h-full">
        <div
          onMouseEnter={() => setTilt((prev) => ({ ...prev, hovered: true }))}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: tilt.hovered
              ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-6px)`
              : 'rotateX(0deg) rotateY(0deg) translateY(0px)',
            transformStyle: 'preserve-3d',
            transition: tilt.hovered
              ? 'transform 0.14s ease-out, box-shadow 0.25s ease, border-color 0.25s ease'
              : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.35s ease',
          }}
          className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#E9E5DC] bg-white p-7 shadow-[0_12px_30px_-20px_rgba(6,27,54,0.2)] hover:border-[#D6952F]/70 hover:shadow-[0_24px_50px_-20px_rgba(6,27,54,0.28)] dark:border-[#1E3557] dark:bg-[#0D2038] dark:hover:border-[#D6952F]/60"
        >
          {/* Cursor spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: tilt.hovered ? 1 : 0,
              background: `radial-gradient(280px circle at ${tilt.gx}% ${tilt.gy}%, rgba(214, 149, 47, 0.14), transparent 72%)`,
            }}
          />

          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D6952F]/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Subtle watermark number */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-3 select-none text-7xl font-black tracking-tighter text-[#061B36]/[0.035] transition-colors duration-300 group-hover:text-[#D6952F]/[0.09] dark:text-white/[0.04]"
          >
            {item.number}
          </span>

          <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
            <div className="flex items-start justify-between gap-3" style={{ transform: 'translateZ(24px)' }}>
              <AnimatedAdvantageIcon id={item.id} hovered={tilt.hovered} />
              <span className="rounded-full border border-[#D6952F]/30 bg-[#FAF8F5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#B37517] transition-colors group-hover:bg-[#D6952F]/15 dark:bg-[#081B33] dark:text-[#F0C27B]">
                {item.tag}
              </span>
            </div>

            <h3
              className="mt-6 text-lg font-extrabold tracking-tight text-[#061B36] dark:text-white"
              style={{ transform: 'translateZ(18px)' }}
            >
              {item.title}
            </h3>

            <p
              className="mt-2.5 text-sm leading-relaxed text-[#5B6479] dark:text-slate-300"
              style={{ transform: 'translateZ(12px)' }}
            >
              {item.description}
            </p>
          </div>

          {/* Bottom highlight footer */}
          <div
            className="relative z-10 mt-6 flex items-center justify-between border-t border-[#E9E5DC] pt-4 dark:border-[#1E3557]"
            style={{ transform: 'translateZ(14px)' }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold text-[#061B36] dark:text-[#F0C27B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F]" />
              {item.footerPill}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C9AC0] transition-colors group-hover:text-[#D6952F]">
              Verified
            </span>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function AdvantageSection() {
  return (
    <section className="relative overflow-hidden border-t border-[#E9E5DC] bg-gradient-to-b from-white via-[#FAF8F5]/75 to-white py-16 sm:py-20 dark:border-[#1E3557] dark:from-[#081B33] dark:via-[#061529] dark:to-[#081B33]">
      {/* Custom keyframe animations for icons */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes zapPulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.95; }
          50% { transform: scale(1.1) rotate(-4deg); opacity: 1; }
        }
      `}</style>

      {/* Subtle ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[620px] -translate-x-1/2 rounded-full bg-[#D6952F]/[0.06] blur-3xl"
      />

      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/35 bg-[#D6952F]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#B37517] dark:text-[#F0C27B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F] animate-pulse" />
            The Gravitas Advantage
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
            Why Executives Choose Gravitas Edge
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-300">
            Traditional job portals rely on keyword algorithms and crowded applicant pools.
            Gravitas Edge provides verified intelligence and direct hiring manager routing.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGE_ITEMS.map((item, idx) => (
            <AdvantageCard3D key={item.id} item={item} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
