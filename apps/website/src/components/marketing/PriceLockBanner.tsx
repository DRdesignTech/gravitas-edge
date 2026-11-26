'use client';

import { useEffect, useRef, useState } from 'react';
import { HiLockClosed, HiArrowRight } from 'react-icons/hi2';
import { useAuth } from '@/lib/auth';
import AuthModal from '@/components/auth/AuthModal';

function DoodleCharacterSvg({
  width,
  height,
  idSuffix,
}: {
  width: number;
  height: number;
  idSuffix: string;
}) {
  const whiteId = `ge3dWhite-${idSuffix}`;
  const limbId = `ge3dLimb-${idSuffix}`;
  const ropeId = `ge3dRope-${idSuffix}`;
  const dropId = `ge3dDrop-${idSuffix}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 -6 96 94"
      fill="none"
      className="overflow-visible"
    >
      <defs>
        <radialGradient id={whiteId} cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F5F7FB" />
          <stop offset="85%" stopColor="#DCE3F0" />
          <stop offset="100%" stopColor="#B8C4DA" />
        </radialGradient>

        <radialGradient id={limbId} cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#E9EEF7" />
          <stop offset="100%" stopColor="#BDC8DF" />
        </radialGradient>

        <linearGradient id={ropeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B87A1E" />
          <stop offset="50%" stopColor="#F4C776" />
          <stop offset="100%" stopColor="#D6952F" />
        </linearGradient>

        <filter id={dropId} x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.5"
            floodColor="#061B36"
            floodOpacity="0.22"
          />
        </filter>
      </defs>

      {/* "!" Realization Bubble */}
      <g className="ge-oops-pop">
        <circle
          cx="42"
          cy="-2"
          r="9.5"
          fill="#D6952F"
          stroke="#061B36"
          strokeWidth="1.5"
        />
        <text
          x="42"
          y="2"
          textAnchor="middle"
          fill="#061B36"
          fontSize="12"
          fontWeight="900"
        >
          !
        </text>
      </g>

      {/* Ground contact shadow */}
      <ellipse
        cx="41"
        cy="81"
        rx="18"
        ry="4.2"
        className="fill-[#061B36]/15 dark:fill-black/45"
      />

      <g className="ge-doodle-bob" filter={`url(#${dropId})`}>
        <g className="ge-doodle-facing">
          <g className="ge-doodle-lean">
            {/* Back / Waving Arm */}
            <g className="ge-wave-arm">
              <rect
                x="15"
                y="40"
                width="20"
                height="9"
                rx="4.5"
                transform="rotate(-24 25 44.5)"
                fill={`url(#${limbId})`}
                stroke="#1B2A4A"
                strokeWidth="1.5"
              />
              <circle
                cx="16"
                cy="47"
                r="4.5"
                fill={`url(#${whiteId})`}
                stroke="#1B2A4A"
                strokeWidth="1.4"
              />
            </g>

            {/* Left 3D Capsule Leg */}
            <g className="ge-leg-stride-l">
              <rect
                x="31"
                y="58"
                width="9.5"
                height="21"
                rx="4.75"
                fill={`url(#${limbId})`}
                stroke="#1B2A4A"
                strokeWidth="1.5"
              />
              <ellipse
                cx="35"
                cy="78"
                rx="6"
                ry="3.6"
                fill={`url(#${whiteId})`}
                stroke="#1B2A4A"
                strokeWidth="1.4"
              />
            </g>

            {/* Right 3D Capsule Leg */}
            <g className="ge-leg-stride-r">
              <rect
                x="42"
                y="58"
                width="9.5"
                height="21"
                rx="4.75"
                fill={`url(#${limbId})`}
                stroke="#1B2A4A"
                strokeWidth="1.5"
              />
              <ellipse
                cx="48"
                cy="78"
                rx="6"
                ry="3.6"
                fill={`url(#${whiteId})`}
                stroke="#1B2A4A"
                strokeWidth="1.4"
              />
            </g>

            {/* Plump 3D Marshmallow Torso */}
            <rect
              x="29"
              y="35"
              width="25"
              height="28"
              rx="12.5"
              fill={`url(#${whiteId})`}
              stroke="#1B2A4A"
              strokeWidth="1.6"
            />
            <ellipse
              cx="37"
              cy="44"
              rx="4.5"
              ry="7"
              fill="#FFFFFF"
              opacity="0.7"
            />

            {/* Big 3D Balloon Head */}
            <ellipse
              cx="42"
              cy="20"
              rx="16.5"
              ry="15.5"
              fill={`url(#${whiteId})`}
              stroke="#1B2A4A"
              strokeWidth="1.6"
            />
            <ellipse
              cx="36"
              cy="12"
              rx="6.5"
              ry="3.8"
              transform="rotate(-18 36 12)"
              fill="#FFFFFF"
              opacity="0.88"
            />

            {/* Expressive Cartoon Eyes */}
            <ellipse cx="46.5" cy="18.5" rx="2.6" ry="3.2" fill="#061B36" />
            <circle cx="47.2" cy="17.3" r="0.9" fill="#FFFFFF" />

            <ellipse cx="53.5" cy="18.5" rx="2.4" ry="3.0" fill="#061B36" />
            <circle cx="54.1" cy="17.3" r="0.85" fill="#FFFFFF" />

            {/* Rosy cheek + smile */}
            <ellipse cx="42" cy="23" rx="2.8" ry="1.6" fill="#F4A59B" opacity="0.55" />
            <path
              d="M46 24.5c2.2 2 5.4 2 7.2 0"
              stroke="#061B36"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Front Pulling Arm */}
            <g className="ge-pull-arm">
              <rect
                x="45"
                y="41"
                width="20"
                height="8.5"
                rx="4.25"
                transform="rotate(6 55 45.25)"
                fill={`url(#${whiteId})`}
                stroke="#1B2A4A"
                strokeWidth="1.5"
              />
              <circle
                cx="65"
                cy="46.5"
                r="4.5"
                fill={`url(#${whiteId})`}
                stroke="#1B2A4A"
                strokeWidth="1.4"
              />
            </g>
          </g>
        </g>
      </g>

      {/* Braided Gold Rope */}
      <g className="ge-rope-pull">
        <line
          x1="67"
          y1="46.5"
          x2="83"
          y2="46.5"
          stroke={`url(#${ropeId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="82" cy="46.5" r="2.8" fill="#D6952F" stroke="#061B36" strokeWidth="1" />
      </g>
    </svg>
  );
}

export default function PriceLockBanner({
  onViewPlans,
}: {
  onViewPlans?: () => void;
}) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [playAnim, setPlayAnim] = useState(false);
  const [settled, setSettled] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (user) return;
    const el = sectionRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setSettled(true);
      return;
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlayAnim(true);
          observer.disconnect();
        }
      },
      { threshold: isMobile ? 0.08 : 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [user]);

  useEffect(() => {
    if (!playAnim) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const timer = window.setTimeout(() => {
      setSettled(true);
    }, isMobile ? 4700 : 10800);
    return () => window.clearTimeout(timer);
  }, [playAnim]);

  if (user) return null;

  return (
    <>
      <style>{`
        /* Shared Limb / Rope / Bubble Keyframes */
        @keyframes ge-doodle-facing {
          0%, 26% { transform: scaleX(1); }
          27%, 34% { transform: scaleX(-1); }
          35%, 100% { transform: scaleX(1); }
        }

        @keyframes ge-doodle-lean {
          0%, 40% { transform: rotate(0deg); }
          43%, 56% { transform: rotate(9deg); }
          59%, 80% { transform: rotate(-14deg); }
          86%, 100% { transform: rotate(0deg); }
        }

        @keyframes ge-doodle-bob {
          0%, 25%, 42%, 57%, 83%, 100% { transform: translate3d(0, 0, 0); }
          6%, 12%, 18%, 22%, 45%, 50%, 54%, 63%, 69%, 75%, 80% { transform: translate3d(0, -2.2px, 0); }
          9%, 15%, 20%, 47%, 52%, 66%, 72%, 78% { transform: translate3d(0, 0.8px, 0); }
        }

        @keyframes ge-leg-stride-l {
          0%, 25%, 42%, 57%, 83%, 100% { transform: rotate(0deg); }
          6%, 15%, 22%, 45%, 52%, 63%, 71%, 78% { transform: rotate(19deg); }
          10%, 19%, 48%, 55%, 67%, 75% { transform: rotate(-18deg); }
        }

        @keyframes ge-leg-stride-r {
          0%, 25%, 42%, 57%, 83%, 100% { transform: rotate(0deg); }
          6%, 15%, 22%, 45%, 52%, 63%, 71%, 78% { transform: rotate(-18deg); }
          10%, 19%, 48%, 55%, 67%, 75% { transform: rotate(19deg); }
        }

        @keyframes ge-pull-arm {
          0%, 57% { transform: rotate(16deg); }
          60%, 82% { transform: rotate(0deg); }
          86%, 100% { transform: rotate(14deg); }
        }

        /* Head scratch while thinking (25-39%), then cheerful wave before exit (85-96%) */
        @keyframes ge-wave-arm {
          0%, 24% { transform: rotate(0deg); }
          27% { transform: rotate(102deg); }
          30% { transform: rotate(118deg); }
          33% { transform: rotate(100deg); }
          36% { transform: rotate(118deg); }
          39%, 83% { transform: rotate(0deg); }
          86% { transform: rotate(82deg); }
          89% { transform: rotate(54deg); }
          92% { transform: rotate(82deg); }
          96%, 100% { transform: rotate(0deg); }
        }

        @keyframes ge-oops-pop {
          0%, 27% { opacity: 0; transform: translate3d(0, 6px, 0) scale(0.5); }
          30%, 38% { opacity: 1; transform: translate3d(0, -4px, 0) scale(1.06); }
          42%, 100% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
        }

        @keyframes ge-rope-pull {
          0%, 57% { opacity: 0; transform: scaleX(0.2); }
          61%, 81% { opacity: 1; transform: scaleX(1); }
          85%, 100% { opacity: 0; transform: scaleX(0); }
        }

        @keyframes ge-cta-appear {
          0%, 80% { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.98); }
          90%, 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }

        /* ── Desktop & Laptop Storyboard (10.5s, >= 640px) ── */
        @keyframes ge-doodle-master {
          0% { transform: translate3d(-110px, 0, 0); opacity: 1; }
          25% { transform: translate3d(200px, 0, 0); opacity: 1; }
          29% { transform: translate3d(200px, 0, 0); opacity: 1; }
          32% { transform: translate3d(200px, -8px, 0); opacity: 1; }
          36%, 42% { transform: translate3d(200px, 0, 0); opacity: 1; }
          56% { transform: translate3d(100vw, 0, 0); opacity: 1; }
          57% { transform: translate3d(100vw, 0, 0); opacity: 0; }
          59% { transform: translate3d(100vw, 0, 0); opacity: 1; }
          81% { transform: translate3d(-4px, 0, 0); opacity: 1; }
          85%, 91% { transform: translate3d(0, 0, 0); opacity: 1; }
          100% { transform: translate3d(-110px, 4px, 0) scale(0.82); opacity: 0; }
        }

        @keyframes ge-text-lockstep {
          0%, 57% { transform: translate3d(100vw, 0, 0); opacity: 0; }
          59% { transform: translate3d(100vw, 0, 0); opacity: 1; }
          81% { transform: translate3d(-4px, 0, 0); opacity: 1; }
          85%, 100% { transform: translate3d(0, 0, 0); opacity: 1; }
        }

        /* ── Mobile-Only Snappy Storyboard (4.5s, < 640px) ── */
        @keyframes ge-mob-doodle {
          0% { transform: translate3d(-68px, 0, 0); opacity: 1; }
          22% { transform: translate3d(96px, 0, 0); opacity: 1; }
          27% { transform: translate3d(96px, -6px, 0); opacity: 1; }
          35% { transform: translate3d(96px, 0, 0); opacity: 1; }
          46% { transform: translate3d(100vw, 0, 0); opacity: 1; }
          48% { transform: translate3d(100vw, 0, 0); opacity: 0; }
          50% { transform: translate3d(78vw, 0, 0); opacity: 1; }
          80% { transform: translate3d(2px, 0, 0); opacity: 1; }
          89% { transform: translate3d(2px, 0, 0); opacity: 1; }
          100% { transform: translate3d(-78px, 4px, 0) scale(0.8); opacity: 0; }
        }

        @keyframes ge-mob-text {
          0%, 48% { transform: translate3d(100vw, 0, 0); opacity: 0; }
          50% { transform: translate3d(82vw, 0, 0); opacity: 1; }
          80% { transform: translate3d(-3px, 0, 0); opacity: 1; }
          85%, 100% { transform: translate3d(0, 0, 0); opacity: 1; }
        }

        .ge-script-text {
          opacity: 0;
          transform: translate3d(100vw, 0, 0);
          will-change: transform, opacity;
        }
        .ge-script-text.is-settled {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          animation: none;
        }

        .ge-script-cta {
          opacity: 0;
          will-change: transform, opacity;
        }
        .ge-script-cta.is-settled {
          opacity: 1;
          transform: none;
          animation: none;
        }

        .ge-doodle-master,
        .ge-doodle-mobile {
          opacity: 0;
          will-change: transform, opacity;
        }

        @media (min-width: 640px) {
          .ge-script-text.is-playing {
            animation: ge-text-lockstep 10.5s ease-in-out forwards;
          }
          .ge-script-cta.is-playing {
            animation: ge-cta-appear 10.5s ease-out forwards;
          }
          .ge-doodle-master.is-playing {
            animation: ge-doodle-master 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-doodle-facing {
            transform-origin: 42px 45px;
            animation: ge-doodle-facing 10.5s steps(1, end) forwards;
          }
          .ge-doodle-master.is-playing .ge-doodle-lean {
            transform-origin: 42px 62px;
            animation: ge-doodle-lean 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-doodle-bob {
            animation: ge-doodle-bob 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-leg-stride-l {
            transform-origin: 36px 60px;
            animation: ge-leg-stride-l 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-leg-stride-r {
            transform-origin: 46px 60px;
            animation: ge-leg-stride-r 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-pull-arm {
            transform-origin: 46px 44px;
            animation: ge-pull-arm 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-wave-arm {
            transform-origin: 33px 44px;
            animation: ge-wave-arm 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-oops-pop {
            transform-origin: 42px 4px;
            animation: ge-oops-pop 10.5s ease-in-out forwards;
          }
          .ge-doodle-master.is-playing .ge-rope-pull {
            transform-origin: left center;
            animation: ge-rope-pull 10.5s ease-in-out forwards;
          }
        }

        @media (max-width: 639px) {
          .ge-script-text.is-playing {
            animation: ge-mob-text 4.5s ease-in-out forwards;
          }
          .ge-script-cta.is-playing {
            animation: ge-cta-appear 4.5s ease-out forwards;
          }
          .ge-doodle-mobile.is-playing {
            animation: ge-mob-doodle 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-doodle-facing {
            transform-origin: 42px 45px;
            animation: ge-doodle-facing 4.5s steps(1, end) forwards;
          }
          .ge-doodle-mobile.is-playing .ge-doodle-lean {
            transform-origin: 42px 62px;
            animation: ge-doodle-lean 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-doodle-bob {
            animation: ge-doodle-bob 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-leg-stride-l {
            transform-origin: 36px 60px;
            animation: ge-leg-stride-l 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-leg-stride-r {
            transform-origin: 46px 60px;
            animation: ge-leg-stride-r 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-pull-arm {
            transform-origin: 46px 44px;
            animation: ge-pull-arm 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-wave-arm {
            transform-origin: 33px 44px;
            animation: ge-wave-arm 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-oops-pop {
            transform-origin: 42px 4px;
            animation: ge-oops-pop 4.5s ease-in-out forwards;
          }
          .ge-doodle-mobile.is-playing .ge-rope-pull {
            transform-origin: left center;
            animation: ge-rope-pull 4.5s ease-in-out forwards;
          }
        }
      `}</style>

      <section
        ref={sectionRef}
        aria-label="Price lock promotional offer"
        className="relative overflow-hidden border-y border-[#D6952F]/25 bg-gradient-to-r from-[#FFF9EE] via-[#FDF4E3] to-[#FFF9EE] dark:from-[#081F3D] dark:via-[#0B284E] dark:to-[#081F3D]"
      >
        <div className="relative mx-auto max-w-[1180px] px-5 py-5 sm:py-6">
          {/* Mobile-Only Visible Doodle Stage (collapses cleanly once settled) */}
          {!settled && (
            <div
              aria-hidden="true"
              className="relative mb-1 h-[54px] sm:hidden"
            >
              <div
                className={`ge-doodle-mobile pointer-events-none absolute left-0 top-0 z-20 ${
                  playAnim ? 'is-playing' : ''
                }`}
              >
                <DoodleCharacterSvg width={58} height={56} idSuffix="mobile" />
              </div>
            </div>
          )}

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Desktop & Laptop Doodle Actor (unchanged) */}
            {!settled && (
              <div
                aria-hidden="true"
                className={`ge-doodle-master pointer-events-none absolute -left-[78px] top-1/2 z-20 -translate-y-1/2 hidden sm:block ${
                  playAnim ? 'is-playing' : ''
                }`}
              >
                <DoodleCharacterSvg width={96} height={94} idSuffix="desktop" />
              </div>
            )}

            {/* Pulled Text Block */}
            <div
              className={`ge-script-text flex items-start gap-3.5 sm:items-center ${
                settled ? 'is-settled' : playAnim ? 'is-playing' : ''
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-sm dark:border dark:border-[#F0C27B]/30 dark:bg-[#D6952F]/15">
                <HiLockClosed className="h-5 w-5" aria-hidden="true" />
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#061B36] px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.09em] text-[#F6D58A] dark:bg-[#D6952F] dark:text-[#061B36]">
                    Price Lock Guarantee
                  </span>
                  <span className="text-xs font-semibold text-[#9A6719] dark:text-[#F0C27B]">
                    For new subscribers
                  </span>
                </div>

                <h2 className="text-[1.05rem] font-bold leading-snug text-[#061B36] dark:text-white sm:text-[1.18rem]">
                  Lock in today&apos;s rate for life.
                </h2>
                <p className="mt-0.5 text-[0.86rem] leading-relaxed text-[#434D66] dark:text-[#C9D3EA]">
                  Register and subscribe today to keep your introductory plan price permanently—never
                  pay more on future renewals, even as pricing updates.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div
              className={`ge-script-cta flex flex-wrap items-center gap-2.5 lg:shrink-0 ${
                settled ? 'is-settled' : playAnim ? 'is-playing' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#061B36] px-5 py-2.5 text-[0.85rem] font-semibold text-[#F6D58A] shadow-sm transition hover:bg-[#0D2B52] dark:bg-[#D6952F] dark:text-[#061B36] dark:hover:bg-[#E5A948]"
              >
                <span>Register &amp; Lock Your Price</span>
                <HiArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              {onViewPlans && (
                <button
                  type="button"
                  onClick={onViewPlans}
                  className="inline-flex items-center justify-center rounded-full border border-[#061B36]/20 bg-white/80 px-4 py-2.5 text-[0.85rem] font-semibold text-[#061B36] transition hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  View Plans
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="signup"
      />
    </>
  );
}
