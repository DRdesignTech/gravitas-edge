/**
 * Smoothly scroll the page to a section anchor.
 *
 * The sticky header is accounted for via `scroll-padding-top` on `html`
 * (see globals.css), which both `scrollIntoView` and native anchor jumps
 * respect, so section headings never end up hidden behind the header.
 */
export function scrollToAnchor(id: string) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function scrollToHash(hash?: string) {
  if (!hash) return;
  const id = hash.replace(/^#/, '');
  if (id) scrollToAnchor(id);
}