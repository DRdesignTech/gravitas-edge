'use client';

/**
 * Lightweight client navigation helpers used to keep browser history clean:
 *
 * - NavigationTracker records the internal routes the visitor actually pushed
 *   to (not Back/Forward pops), so pages with a "back" affordance can detect a
 *   meaningful previous page and either use a real browser Back or fall back to
 *   a safe, defined target.
 * - The opportunities listing persists its filters/page/scroll and restores them
 *   when the visitor returns from a detail page, so Back lands on the exact
 *   listing they were reading.
 */

const STACK_KEY = 'ge-nav-stack';
const MAX_STACK = 20;

function readStack(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(0, MAX_STACK)));
  } catch {
    // Storage unavailable (private mode, blocked cookies) — degrade gracefully.
  }
}

/**
 * Record a pushed (forward) internal route. Only called by NavigationTracker for
 * non-Back/Forward navigations; Back/Forward pops never record the current route
 * so "the most recent distinct page before this one" stays accurate.
 */
export function recordInternalRoute(pathname: string) {
  if (typeof window === 'undefined' || !pathname) return;
  const stack = readStack();
  writeStack([...stack, pathname]);
}

/** Path of the most recent distinct internal page visited before the current one. */
export function previousInternalRoute(): string | null {
  if (typeof window === 'undefined') return null;
  const stack = readStack();
  if (stack.length === 0) return null;
  const current = window.location.pathname;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] !== current) return stack[i];
  }
  return null;
}
