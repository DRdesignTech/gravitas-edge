'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { recordInternalRoute } from '@/lib/navigation';

/**
 * Keeps a sessionStorage breadcrumb of the internal routes the visitor pushed
 * to (Links / router navigation). Browser Back/Forward pops are excluded, so a
 * page can reliably tell whether it was reached from a meaningful internal
 * route and make its "back" behaviour match history precisely.
 */
export default function NavigationTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  const isPop = useRef(false);

  useEffect(() => {
    const onPop = () => {
      isPop.current = true;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (isPop.current) {
      // Browser/Next Back-Forward pop — do not record; the route is already in
      // the stack from when it was first pushed.
      isPop.current = false;
      return;
    }
    recordInternalRoute(pathname);
  }, [pathname]);

  return null;
}
