'use client';

import { useEffect, useRef, useState } from 'react';

export default function NoApplyCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [playAnim, setPlayAnim] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setSettled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlayAnim(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playAnim) return;
    const timer = window.setTimeout(() => {
      setSettled(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [playAnim]);

  return (
    <div ref={cardRef} className="relative">
      <style>{`
        /* Butter-smooth continuous deceleration curve from off-screen right (100vw) to fixed spot (0) */
        @keyframes ge-card-push-track {
          0% {
            transform: translate3d(100vw, 0, 0);
            opacity: 1;
          }
          68% {
            transform: translate3d(-4px, 0, 0);
            opacity: 1;
          }
          76%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }

        /* After card locks in, doodle steps back, sighs in relief, waves, and glides off right */
        @keyframes ge-pusher-exit {
          0%, 68% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
          78% {
            transform: translate3d(18px, -3px, 0) scale(1);
            opacity: 1;
          }
          86% {
            transform: translate3d(20px, 0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate3d(165px, 6px, 0) scale(0.82);
            opacity: 0;
          }
        }

        /* Heavy forward push lean against the card, then stands upright in relief */
        @keyframes ge-pusher-lean {
          0%, 64% {
            transform: rotate(-18deg);
          }
          75%, 100% {
            transform: rotate(0deg);
          }
        }

        /* Smooth effort stride bobbing */
        @keyframes ge-pusher-bob {
          0%, 68%, 100% { transform: translate3d(0, 0, 0); }
          10%, 24%, 38%, 52%, 62% { transform: translate3d(0, -2.5px, 0); }
          17%, 31%, 45%, 57% { transform: translate3d(0, 1px, 0); }
        }

        /* Smooth straining leg strides */
        @keyframes ge-pusher-leg-l {
          0%, 68%, 100% { transform: rotate(0deg); }
          12%, 34%, 56% { transform: rotate(22deg); }
          23%, 45% { transform: rotate(-18deg); }
        }

        @keyframes ge-pusher-leg-r {
          0%, 68%, 100% { transform: rotate(0deg); }
          12%, 34%, 56% { transform: rotate(-18deg); }
          23%, 45% { transform: rotate(22deg); }
        }

        /* Back arm braces against card while pushing with back, then waves proudly */
        @keyframes ge-pusher-wave {
          0%, 72% { transform: rotate(0deg); }
          79% { transform: rotate(74deg); }
          84% { transform: rotate(48deg); }
          89% { transform: rotate(74deg); }
          94%, 100% { transform: rotate(0deg); }
        }

        /* Struggle face visible while pushing, switches to relieved smile once settled */
        @keyframes ge-face-struggle {
          0%, 68% { opacity: 1; }
          71%, 100% { opacity: 0; }
        }

        @keyframes ge-face-relief {
          0%, 68% { opacity: 0; }
          72%, 100% { opacity: 1; }
        }

        /* Animated sweat droplets popping off forehead during the push */
        @keyframes ge-sweat-drop {
          0%, 8% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
          18% { opacity: 1; transform: translate3d(-4px, -6px, 0) scale(1); }
          34% { opacity: 0; transform: translate3d(-8px, 6px, 0) scale(0.7); }
          36%, 42% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
          50% { opacity: 1; transform: translate3d(-4px, -6px, 0) scale(1); }
          66%, 100% { opacity: 0; transform: translate3d(-9px, 7px, 0) scale(0.7); }
        }

        /* Floor friction dust puffs behind heels while pushing */
        @keyframes ge-floor-dust {
          0%, 8%, 68%, 100% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.5); }
          18%, 36%, 54% { opacity: 0.7; transform: translate3d(10px, -4px, 0) scale(1.1); }
          26%, 44%, 62% { opacity: 0; transform: translate3d(18px, -8px, 0) scale(1.3); }
        }

        .ge-push-track {
          opacity: 0;
          transform: translate3d(100vw, 0, 0);
          will-change: transform, opacity;
        }
        .ge-push-track.is-playing {
          animation: ge-card-push-track 4.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ge-push-track.is-settled {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          animation: none;
        }

        .ge-pusher-actor {
          will-change: transform, opacity;
        }
        .is-playing .ge-pusher-actor {
          animation: ge-pusher-exit 4.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .is-playing .ge-pusher-lean {
          transform-origin: 54px 78px;
          animation: ge-pusher-lean 4.8s ease-in-out forwards;
        }
        .is-playing .ge-pusher-bob {
          animation: ge-pusher-bob 4.8s ease-in-out forwards;
        }
        .is-playing .ge-pusher-leg-l {
          transform-origin: 48px 76px;
          animation: ge-pusher-leg-l 4.8s ease-in-out forwards;
        }
        .is-playing .ge-pusher-leg-r {
          transform-origin: 58px 76px;
          animation: ge-pusher-leg-r 4.8s ease-in-out forwards;
        }
        .is-playing .ge-pusher-wave {
          transform-origin: 44px 54px;
          animation: ge-pusher-wave 4.8s ease-in-out forwards;
        }
        .is-playing .ge-face-struggle {
          animation: ge-face-struggle 4.8s ease-out forwards;
        }
        .is-playing .ge-face-relief {
          animation: ge-face-relief 4.8s ease-in forwards;
        }
        .is-playing .ge-sweat-drop {
          animation: ge-sweat-drop 4.8s ease-in-out forwards;
        }
        .is-playing .ge-floor-dust {
          animation: ge-floor-dust 4.8s ease-out forwards;
        }
      `}</style>

      <div
        className={`ge-push-track relative ${
          settled ? 'is-settled' : playAnim ? 'is-playing' : ''
        }`}
      >
        {/* The Card */}
        <div className="bg-[#061B36] dark:bg-[#0A2645] text-white rounded-[16px] p-[26px] border border-transparent dark:border-[rgba(240,194,123,0.18)] shadow-lg">
          <h3 className="text-white font-bold text-[1.35rem] leading-[1.15] mb-2 font-sans">
            No &ldquo;Apply Now&rdquo; button
          </h3>
          <p className="text-[#C9D3EA] text-[0.93rem] mb-2.5 leading-[1.55]">
            You reach out yourself, with context.
          </p>
          <ol className="list-decimal pl-5 text-[#C9D3EA] text-[0.93rem]">
            <li className="my-1.5 leading-[1.55]">See a relevant opportunity in your vault</li>
            <li className="my-1.5 leading-[1.55]">View the hiring contact or application pathway</li>
            <li className="my-1.5 leading-[1.55]">Share your resume directly</li>
          </ol>
          <p className="text-[#8C9AC0] text-[0.78rem] mt-3.5 leading-[1.5]">
            Gravitas Edge is an opportunity-information service, not a recruitment agency. We
            don&apos;t guarantee interviews or placements.
          </p>
        </div>

        {/* Large 3D Cartoon Doodle grounded on the floor pushing with its BACK from the right side */}
        {!settled && (
          <div
            aria-hidden="true"
            className="ge-pusher-actor pointer-events-none absolute -right-[82px] sm:-right-[98px] bottom-0 z-20 origin-bottom scale-[0.72] sm:scale-100"
          >
            <svg
              width="136"
              height="136"
              viewBox="0 0 112 112"
              fill="none"
              className="overflow-visible"
            >
              <defs>
                <radialGradient id="gePushWhite" cx="35%" cy="28%" r="70%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="55%" stopColor="#F5F7FB" />
                  <stop offset="85%" stopColor="#DCE3F0" />
                  <stop offset="100%" stopColor="#B8C4DA" />
                </radialGradient>

                <radialGradient id="gePushLimb" cx="35%" cy="25%" r="75%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="65%" stopColor="#E9EEF7" />
                  <stop offset="100%" stopColor="#BDC8DF" />
                </radialGradient>

                <filter id="gePushDrop" x="-25%" y="-20%" width="150%" height="150%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="3"
                    floodColor="#061B36"
                    floodOpacity="0.25"
                  />
                </filter>
              </defs>

              {/* Ground contact shadow + floor dust puffs */}
              <ellipse
                cx="56"
                cy="102"
                rx="26"
                ry="5"
                className="fill-[#061B36]/22 dark:fill-black/55"
              />
              <g className="ge-floor-dust">
                <circle cx="84" cy="99" r="3.5" className="fill-[#C8943E]/40 dark:fill-white/20" />
                <circle cx="91" cy="96" r="2.2" className="fill-[#C8943E]/30 dark:fill-white/15" />
              </g>

              {/* Facing RIGHT so his BACK presses against the right edge of the card */}
              <g filter="url(#gePushDrop)">
                <g className="ge-pusher-bob">
                  <g className="ge-pusher-lean">
                    {/* Back / Waving Arm (braced back against card while pushing, then waves) */}
                    <g className="ge-pusher-wave">
                      <rect
                        x="20"
                        y="50"
                        width="24"
                        height="11"
                        rx="5.5"
                        transform="rotate(-14 32 55.5)"
                        fill="url(#gePushLimb)"
                        stroke="#1B2A4A"
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="20"
                        cy="53"
                        r="5.5"
                        fill="url(#gePushWhite)"
                        stroke="#1B2A4A"
                        strokeWidth="1.6"
                      />
                    </g>

                    {/* Left 3D Capsule Leg */}
                    <g className="ge-pusher-leg-l">
                      <rect
                        x="41"
                        y="73"
                        width="12"
                        height="26"
                        rx="6"
                        fill="url(#gePushLimb)"
                        stroke="#1B2A4A"
                        strokeWidth="1.8"
                      />
                      <ellipse
                        cx="47"
                        cy="98"
                        rx="7.5"
                        ry="4.2"
                        fill="url(#gePushWhite)"
                        stroke="#1B2A4A"
                        strokeWidth="1.6"
                      />
                    </g>

                    {/* Right 3D Capsule Leg */}
                    <g className="ge-pusher-leg-r">
                      <rect
                        x="55"
                        y="73"
                        width="12"
                        height="26"
                        rx="6"
                        fill="url(#gePushLimb)"
                        stroke="#1B2A4A"
                        strokeWidth="1.8"
                      />
                      <ellipse
                        cx="62"
                        cy="98"
                        rx="7.5"
                        ry="4.2"
                        fill="url(#gePushWhite)"
                        stroke="#1B2A4A"
                        strokeWidth="1.6"
                      />
                    </g>

                    {/* Plump 3D Marshmallow Torso */}
                    <rect
                      x="38"
                      y="44"
                      width="32"
                      height="35"
                      rx="16"
                      fill="url(#gePushWhite)"
                      stroke="#1B2A4A"
                      strokeWidth="1.9"
                    />
                    <ellipse
                      cx="48"
                      cy="55"
                      rx="6"
                      ry="9"
                      fill="#FFFFFF"
                      opacity="0.72"
                    />

                    {/* Big 3D Balloon Head */}
                    <ellipse
                      cx="54"
                      cy="25"
                      rx="21"
                      ry="19.5"
                      fill="url(#gePushWhite)"
                      stroke="#1B2A4A"
                      strokeWidth="1.9"
                    />
                    <ellipse
                      cx="46"
                      cy="15"
                      rx="8"
                      ry="4.8"
                      transform="rotate(-18 46 15)"
                      fill="#FFFFFF"
                      opacity="0.88"
                    />

                    {/* Sweat Droplets during struggle */}
                    <g className="ge-sweat-drop">
                      <path
                        d="M36 12c0 3-2.5 5-2.5 5S31 15 31 12a2.5 2.5 0 0 1 5 0z"
                        fill="#7DD3FC"
                        stroke="#0369A1"
                        strokeWidth="1.1"
                      />
                      <path
                        d="M42 6c0 2.4-2 4-2 4s-2-1.6-2-4a2 2 0 0 1 4 0z"
                        fill="#BAE6FD"
                        stroke="#0369A1"
                        strokeWidth="1"
                      />
                    </g>

                    {/* STRUGGLE FACE (while pushing) */}
                    <g className="ge-face-struggle">
                      {/* Furrowed effort eyebrows */}
                      <path
                        d="M55 17l7 3M73 17l-6 3"
                        stroke="#061B36"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      {/* Squeezed-shut > < effort eyes */}
                      <path
                        d="M56 22l4.5 2.2-4.5 2.2"
                        stroke="#061B36"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M71 22l-4.5 2.2 4.5 2.2"
                        stroke="#061B36"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Flushed strain cheek */}
                      <ellipse cx="52" cy="29" rx="4.2" ry="2.5" fill="#F87171" opacity="0.55" />
                      {/* Gritted / wavy effort mouth */}
                      <path
                        d="M58 32c1.5-1.6 3-1.6 4.2 0 1.2 1.6 2.7 1.6 4.2 0 1.2-1.5 2.4-1.5 3.4 0"
                        stroke="#061B36"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* RELIEVED HAPPY FACE (once card is positioned) */}
                    <g className="ge-face-relief">
                      <ellipse cx="60" cy="23.5" rx="3.2" ry="3.8" fill="#061B36" />
                      <circle cx="60.8" cy="22" r="1.1" fill="#FFFFFF" />
                      <ellipse cx="69" cy="23.5" rx="2.9" ry="3.5" fill="#061B36" />
                      <circle cx="69.7" cy="22" r="1" fill="#FFFFFF" />
                      <ellipse cx="54" cy="29" rx="3.4" ry="2" fill="#F4A59B" opacity="0.55" />
                      <path
                        d="M59 30.5c2.5 2.4 6.2 2.4 8.2 0"
                        stroke="#061B36"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Front Arm bent forward for balance while shoving with back */}
                    <rect
                      x="58"
                      y="52"
                      width="24"
                      height="11"
                      rx="5.5"
                      transform="rotate(24 70 57.5)"
                      fill="url(#gePushWhite)"
                      stroke="#1B2A4A"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="80"
                      cy="62"
                      r="5.6"
                      fill="url(#gePushWhite)"
                      stroke="#1B2A4A"
                      strokeWidth="1.7"
                    />
                  </g>
                </g>
              </g>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
