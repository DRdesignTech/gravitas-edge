'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { scrollToAnchor } from '@/lib/scroll';

interface SaleItem {
  minutesAgo: number;
  city: string;
  country: string;
  flag: string;
  planName: string;
}

const sampleSales: SaleItem[] = [
  { minutesAgo: 30, city: 'Dubai', country: 'UAE', flag: '🇦🇪', planName: 'Global Career Access' },
  { minutesAgo: 52, city: 'Bengaluru', country: 'India', flag: '🇮🇳', planName: 'the Leadership India + Global Career Access bundle' },
  { minutesAgo: 78, city: 'London', country: 'UK', flag: '🇬🇧', planName: 'Global Leadership Access' },
  { minutesAgo: 115, city: 'Mumbai', country: 'India', flag: '🇮🇳', planName: 'Executive Premier Access' },
  { minutesAgo: 160, city: 'Riyadh', country: 'Saudi Arabia', flag: '🇸🇦', planName: 'Global Career Access' },
  { minutesAgo: 205, city: 'Pune', country: 'India', flag: '🇮🇳', planName: 'Management India' },
  { minutesAgo: 250, city: 'Singapore', country: 'Singapore', flag: '🇸🇬', planName: 'Global Leadership Access' },
];

function formatTimeAgo(minutes: number) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes >= 10 && hours < 3
    ? `${hours} h ${remainingMinutes} min ago`
    : `${hours} h ago`;
}

export default function RecentPurchasePopup() {
  const pathname = usePathname();
  const [currentSale, setCurrentSale] = useState<SaleItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const currentIndex = useRef(0);
  const shownCount = useRef(0);

  useEffect(() => {
    if (pathname !== '/' || muted) return;

    const showNextSale = () => {
      if (muted || shownCount.current >= 8) return;

      const sale = sampleSales[currentIndex.current % sampleSales.length];
      currentIndex.current += 1;
      shownCount.current += 1;

      setCurrentSale(sale);
      setVisible(true);

      // Hide after 6 seconds
      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 6000);

      return hideTimer;
    };

    // First appearance after 6 seconds
    const initialTimer = setTimeout(() => {
      showNextSale();

      // Recurring loop every 20 seconds (6s visible + 14s hidden)
      const interval = setInterval(() => {
        showNextSale();
      }, 20000);

      return () => clearInterval(interval);
    }, 6000);

    return () => clearTimeout(initialTimer);
  }, [pathname, muted]);

  if (!currentSale || muted) return null;

  const handlePopupClick = (e: React.MouseEvent) => {
    // If the close button was clicked, don't trigger the scroll
    if ((e.target as HTMLElement).closest('.sx') || (e.target as HTMLElement).closest('button')) return;
    setVisible(false);
    scrollToAnchor('plans');
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    setMuted(true);
  };

  return (
    <div
      className={`spop fixed left-5 bottom-5 z-[65] w-[330px] max-w-[calc(100vw-100px)] bg-white border border-[#E9E5DC] border-l-4 border-l-[#22C55E] rounded-[14px] shadow-[0_18px_40px_-14px_rgba(6,27,54,0.45)] py-3 pl-3 pr-[34px] flex gap-3 items-center cursor-pointer font-sans transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.1)] max-[600px]:left-2.5 max-[600px]:bottom-3 max-[600px]:right-[84px] max-[600px]:w-auto max-[600px]:py-2.5 max-[600px]:pl-2.5 max-[600px]:pr-[30px] ${
        visible ? 'show translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0 pointer-events-none'
      }`}
      id="salePop"
      role="status"
      aria-live="polite"
      onClick={handlePopupClick}
    >
      <div className="sf flex-[0_0_46px] h-[46px] rounded-[12px] bg-gradient-to-br from-[#061B36] to-[#163056] grid place-items-center text-[1.45rem] relative shrink-0 max-[600px]:flex-[0_0_38px] max-[600px]:h-[38px] max-[600px]:text-[1.15rem]">
        {currentSale.flag}
        <i className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-[#16A34A] text-white text-[0.62rem] not-italic grid place-items-center border-2 border-white font-bold">
          ✓
        </i>
      </div>
      <div>
        <div className="st text-[0.8rem] leading-[1.4] text-[#1A2236] max-[600px]:text-[0.74rem]">
          Someone in <b className="text-[#061B36] font-bold">{currentSale.city}, {currentSale.country}</b> subscribed to{' '}
          <span className="pl text-[#C8842D] font-bold">{currentSale.planName}</span>
        </div>
        <div className="sm flex gap-x-2 gap-y-1 items-center flex-wrap mt-[3px] text-[0.7rem] text-[#5B6479]">
          <span className="whitespace-nowrap">{formatTimeAgo(currentSale.minutesAgo)}</span>
          <span className="lv text-[#15803D] font-bold whitespace-nowrap">● Recent subscription</span>
        </div>
      </div>
      <button
        type="button"
        className="sx absolute top-1.5 right-2 bg-transparent border-0 text-[1rem] text-[#5B6479] hover:text-[#061B36] leading-none p-0.5 cursor-pointer"
        aria-label="Hide purchase notifications"
        onClick={handleClose}
      >
        ×
      </button>
    </div>
  );
}
