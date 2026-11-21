'use client';

import { useTheme } from '@/components/theme/ThemeProvider';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      id="themeBtn"
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-[36px] h-[36px] shrink-0 rounded-[10px] border-[1.5px] border-[#E0A85A] bg-transparent grid place-items-center cursor-pointer transition-colors hover:bg-[#E0A85A]/10 ${className}`}
    >
      <svg
        className="w-[17px] h-[17px] stroke-[#061B36] fill-none dark:hidden"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
      <svg
        className="w-[17px] h-[17px] stroke-[#F2F5FA] fill-none hidden dark:block"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
