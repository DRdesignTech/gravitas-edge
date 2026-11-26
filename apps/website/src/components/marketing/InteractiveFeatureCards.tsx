'use client';

import { useState, type ReactNode, type MouseEvent } from 'react';
import { HiGlobeAlt, HiUserGroup, HiClock, HiArrowRight } from 'react-icons/hi2';

interface FeatureItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  backTitle: string;
  backDescription: string;
  ctaLabel: string;
  onAction: () => void;
}

function FeatureCard3D({ item }: { item: FeatureItem }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 14;
    const rx = (0.5 - py) * 14;
    setTilt({
      rx,
      ry,
      mx: px * 100,
      my: py * 100,
      hovering: true,
    });
  };

  const handleMouseEnter = () => {
    setTilt((prev) => ({ ...prev, hovering: true }));
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50, hovering: false });
  };

  return (
    <div
      className="group relative h-[210px] select-none"
      style={{ perspective: '1000px' }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <div
        className="ge-card-3d-inner relative h-full w-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry + (tilt.hovering ? 180 : 0)}deg) scale(${
            tilt.hovering ? 1.02 : 1
          })`,
          transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 flex flex-col justify-center rounded-[16px] border border-[#061B36]/10 bg-white/85 p-5 shadow-[0_10px_28px_-14px_rgba(6,27,54,0.14)] dark:border-white/10 dark:bg-[#0A2242]/80"
          style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          <div style={{ transformStyle: 'preserve-3d' }}>
            <div
              className="mb-3 grid h-11 w-11 place-items-center rounded-[12px] bg-[#FBF0DE] text-[1.3rem] shadow-sm dark:bg-[#201D19]"
              style={{ transform: 'translateZ(26px)' }}
            >
              {item.icon}
            </div>

            <h3
              className="mb-1 font-sans text-[1rem] font-bold leading-[1.15] text-[#061B36] dark:text-[#F2F5FA]"
              style={{ transform: 'translateZ(18px)' }}
            >
              {item.title}
            </h3>

            <p
              className="text-[0.9rem] leading-[1.55] text-[#5B6479] dark:text-[#9FB0CC]"
              style={{ transform: 'translateZ(10px)' }}
            >
              {item.description}
            </p>
          </div>
        </div>

        {/* Back Face (shown on hover) */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-[16px] border border-[#D6952F]/40 bg-gradient-to-br from-[#061B36] to-[#0D2B52] p-5 text-white shadow-[0_20px_42px_-16px_rgba(6,27,54,0.45)]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Cursor-following gold 3D spotlight on back face */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[16px] transition-opacity duration-300"
            style={{
              opacity: tilt.hovering ? 1 : 0,
              background: `radial-gradient(240px circle at ${100 - tilt.mx}% ${tilt.my}%, rgba(214, 149, 47, 0.22), transparent 72%)`,
            }}
          />

          <div style={{ transformStyle: 'preserve-3d' }}>
            <span
              className="inline-block rounded-full bg-[#D6952F]/20 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#F6D58A]"
              style={{ transform: 'translateZ(20px)' }}
            >
              {item.title}
            </span>
            <h4
              className="mt-2 font-sans text-[1.02rem] font-bold text-white"
              style={{ transform: 'translateZ(24px)' }}
            >
              {item.backTitle}
            </h4>
            <p
              className="mt-1 text-[0.84rem] leading-relaxed text-[#C9D3EA]"
              style={{ transform: 'translateZ(14px)' }}
            >
              {item.backDescription}
            </p>
          </div>

          <div style={{ transform: 'translateZ(22px)' }}>
            <button
              type="button"
              onClick={item.onAction}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D6952F] px-3.5 py-1.5 text-[0.78rem] font-semibold text-[#061B36] transition hover:bg-[#E8AD4F]"
            >
              <span>{item.ctaLabel}</span>
              <HiArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveFeatureCards({
  onScrollTo,
  onOpenOpportunities,
}: {
  onScrollTo: (id: string) => void;
  onOpenOpportunities: () => void;
}) {
  const items: FeatureItem[] = [
    {
      id: 'countries',
      icon: <HiGlobeAlt className="h-5 w-5 text-[#C8943E] dark:text-[#F0C27B]" aria-hidden="true" />,
      title: 'Multiple countries',
      description: "One subscription covers every country in your vault's coverage.",
      backTitle: 'India, GCC & Global Hubs',
      backDescription: 'Browse curated roles across UAE, Saudi Arabia, Singapore, UK, US, India & more.',
      ctaLabel: 'Explore Countries',
      onAction: () => onScrollTo('countries'),
    },
    {
      id: 'pathways',
      icon: <HiUserGroup className="h-5 w-5 text-[#C8943E] dark:text-[#F0C27B]" aria-hidden="true" />,
      title: 'Direct pathways',
      description: 'Recruiter or hiring-manager details where the source provides them.',
      backTitle: 'Reach Decision-Makers',
      backDescription: 'Skip generic job boards and reach hiring contacts or official pathways directly.',
      ctaLabel: 'Try Free Preview',
      onAction: () => onScrollTo('free-preview'),
    },
    {
      id: 'updated',
      icon: <HiClock className="h-5 w-5 text-[#C8943E] dark:text-[#F0C27B]" aria-hidden="true" />,
      title: 'Regularly updated',
      description: 'Expired roles are removed automatically, so you only see live listings.',
      backTitle: 'Fresh, Active Listings',
      backDescription: 'Our vaults are continuously refreshed so you never waste time on closed roles.',
      ctaLabel: 'Browse Live Roles',
      onAction: onOpenOpportunities,
    },
  ];

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .ge-card-3d-inner {
            transform: rotateY(180deg) !important;
          }
        }
      `}</style>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {items.map((item) => (
          <FeatureCard3D key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
