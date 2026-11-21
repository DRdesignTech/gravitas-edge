'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { scrollToAnchor } from '@/lib/scroll';
import Link from 'next/link';

export default function WelcomeSplashModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only show automatically on the homepage on first visit
    if (pathname === '/') {
      const shownBefore = sessionStorage.getItem('ge_splash_shown');
      if (!shownBefore) {
        const timer = setTimeout(() => {
          setOpen(true);
          sessionStorage.setItem('ge_splash_shown', 'true');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-splash-modal', handleOpen);
    return () => window.removeEventListener('open-splash-modal', handleOpen);
  }, []);

  const handleBuildBundle = () => {
    setOpen(false);
    scrollToAnchor('plans');
  };

  const handleFreePreview = () => {
    setOpen(false);
    scrollToAnchor('free-preview');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#061B36]/[0.62] backdrop-blur-[3px] font-sans animate-in fade-in duration-300"
      id="splashBg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splashTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="relative w-full max-w-[440px] rounded-[24px] overflow-hidden bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300"
        id="splash"
      >
        {/* Header Banner */}
        <div className="relative text-center px-[26px] pt-7 pb-6 text-white bg-[radial-gradient(400px_200px_at_80%_0%,#2A4566,transparent),linear-gradient(150deg,#061B36,#0E2B52)]">
          <button
            type="button"
            className="absolute top-2.5 left-3 w-[30px] h-[30px] rounded-full border-0 bg-white/[0.12] hover:bg-white/20 text-white text-[1.1rem] flex items-center justify-center z-10 transition-colors cursor-pointer"
            id="spX"
            aria-label="Close offer"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <div className="absolute -right-[18px] -top-[18px] w-24 h-24 rounded-full bg-gradient-to-br from-[#F0C27B] to-[#C8842D] text-[#061B36] flex flex-col items-center justify-center font-extrabold text-[1.3rem] leading-none rotate-12 shadow-[0_10px_20px_-8px_rgba(0,0,0,0.5)] select-none pointer-events-none">
            <div>
              20%<small className="block text-[0.6rem] tracking-[0.1em] font-bold">OFF</small>
            </div>
          </div>
          <span className="inline-block bg-[#D6952F] text-[#061B36] font-extrabold text-[0.7rem] tracking-[0.12em] px-3 py-1 rounded-full mb-3 uppercase">
            BUNDLE OFFER
          </span>
          <h3 id="splashTitle" className="text-white font-bold text-[1.55rem] leading-[1.2] font-sans">
            India + Global access,
            <br />
            <span className="text-[#F0C27B]">save 20% every month</span>
          </h3>
          <p className="text-[#C9D3EA] text-[0.88rem] mt-2 font-normal">
            Combine an India vault with its matching Global vault in one checkout.
          </p>
        </div>

        {/* Comparison Rows & CTAs */}
        <div className="p-[20px_22px_22px] flex flex-col gap-2.5 bg-white text-[#1A2236]">
          <div className="flex justify-between items-center gap-2.5 border border-[#E9E5DC] rounded-[12px] p-[11px_14px] text-[0.84rem]">
            <div>
              <b className="text-[#061B36] font-bold block text-left">Leadership India + Global Career Access</b>
              <small className="text-[#5B6479] text-[0.75rem] block text-left mt-0.5">
                10–15 years India · Under 10 years International
              </small>
            </div>
            <div className="text-right whitespace-nowrap">
              <s className="text-[#5B6479] text-[0.75rem] block line-through">₹2,498</s>
              <strong className="text-[#15803D] text-[1rem] font-bold">₹1,998</strong>
              <small className="text-[#5B6479] text-[0.75rem]">/mo</small>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2.5 border border-[#E9E5DC] rounded-[12px] p-[11px_14px] text-[0.84rem]">
            <div>
              <b className="text-[#061B36] font-bold block text-left">Management India + Global Career Access</b>
              <small className="text-[#5B6479] text-[0.75rem] block text-left mt-0.5">
                5–10 years India · Under 10 years International
              </small>
            </div>
            <div className="text-right whitespace-nowrap">
              <s className="text-[#5B6479] text-[0.75rem] block line-through">₹2,098</s>
              <strong className="text-[#15803D] text-[1rem] font-bold">₹1,678</strong>
              <small className="text-[#5B6479] text-[0.75rem]">/mo</small>
            </div>
          </div>

          <div className="flex gap-2 mt-1.5">
            <button
              type="button"
              className="flex-1 justify-center whitespace-nowrap py-3 px-3 rounded-full font-bold text-[0.95rem] bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] transition-colors flex items-center border-0 cursor-pointer"
              id="spGo"
              onClick={handleBuildBundle}
            >
              Build my bundle
            </button>
            <Link
              type="button"
              className="flex-1 justify-center whitespace-nowrap py-3 px-3 rounded-full font-bold text-[0.95rem] bg-transparent hover:bg-[#061B36]/[0.04] text-[#061B36] border border-[#E9E5DC] transition-colors flex items-center cursor-pointer"
              id="spPrev"
              href="/opportunities"
              onClick={handleFreePreview}
            >
              Free Preview
            </Link>
          </div>

          <div className="text-[0.7rem] text-[#5B6479] text-center mt-1">
            Discount applies while both vaults stay active. Plus applicable taxes.
          </div>
        </div>
      </div>
    </div>
  );
}
