'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { scrollToAnchor } from '@/lib/scroll';

interface HomeAnchorProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Section anchor for the homepage long-scroll journey.
 * On the homepage it smooth-scrolls to the matching section and only syncs the
 * URL hash (replaceState — no extra history entry). From another route it lets
 * Next.js <Link> perform a single history navigation to /#section.
 */
export default function HomeAnchor({ href, children, className = '', ariaLabel }: HomeAnchorProps) {
  const pathname = usePathname();
  const id = href.replace(/^#/, '');
  return (
    <Link
      href={`/${href}`}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (pathname !== '/') return;
        e.preventDefault();
        scrollToAnchor(id);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', href);
        }
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
