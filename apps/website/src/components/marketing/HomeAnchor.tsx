'use client';

import { usePathname, useRouter } from 'next/navigation';
import { scrollToAnchor } from '@/lib/scroll';

interface HomeAnchorProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Section anchor for the homepage long-scroll journey.
 * On the homepage it smooth-scrolls to the matching section; from another
 * route it navigates to the homepage and lets the hash target the section.
 */
export default function HomeAnchor({ href, children, className = '', ariaLabel }: HomeAnchorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const id = href.replace(/^#/, '');
  return (
    <a
      href={`/${href}`}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        if (pathname === '/') {
          scrollToAnchor(id);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', href);
          }
        } else {
          router.push(`/${href}`);
        }
      }}
      className={className}
    >
      {children}
    </a>
  );
}