'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui';

const RESTRICTION_MESSAGE = 'Copying and saving this content is restricted.';

const BLOCKED_KEYS: Record<string, boolean> = {
  c: true, // Ctrl/Cmd + C
  x: true, // Ctrl/Cmd + X
  v: true, // Ctrl/Cmd + V
  a: true, // Ctrl/Cmd + A
  s: true, // Ctrl/Cmd + S
  p: true, // Ctrl/Cmd + P
};

/**
 * Hook that blocks common copy/save gestures on the element returned by `ref`.
 * Intended as a lightweight deterrent for premium/restricted content. It cannot
 * (and does not claim to) fully prevent screenshots or determined copying.
 */
export function useContentProtection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const container = node;

    const isProtectedTarget = (target: EventTarget | null): boolean =>
      target instanceof Node && container.contains(target);

    const handleBlocked = (message = RESTRICTION_MESSAGE) => {
      showToast(message, 'warning');
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
        handleBlocked();
      }
    };

    const handleSelectStart = (e: Event) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
        handleBlocked();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (BLOCKED_KEYS[key] && isProtectedTarget(e.target)) {
        e.preventDefault();
        handleBlocked();
      }
    };

    document.addEventListener('copy', handleCopyCutPaste, true);
    document.addEventListener('cut', handleCopyCutPaste, true);
    document.addEventListener('paste', handleCopyCutPaste, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('copy', handleCopyCutPaste, true);
      document.removeEventListener('cut', handleCopyCutPaste, true);
      document.removeEventListener('paste', handleCopyCutPaste, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showToast]);

  return ref;
}

export default function ContentProtection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useContentProtection();

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
