'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin top progress bar while a page is loading after a link tap.
 * Loading state is DERIVED from the URL: once the URL changes away from the
 * one where the tap happened, the bar disappears by itself.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams?.toString() ?? ''}`;

  // URL at the moment a navigation started (null = idle)
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const loading = startedAt !== null && startedAt === currentUrl;

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('/#') &&
        !target.hasAttribute('download') &&
        target.getAttribute('target') !== '_blank'
      ) {
        const here = window.location.pathname + window.location.search;
        if (href !== here) {
          setStartedAt(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    return () => document.removeEventListener('click', handleAnchorClick, { capture: true });
  }, []);

  // Safety: never spin forever (e.g. navigation cancelled)
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setStartedAt(null), 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="h-full bg-primary animate-[sf-progress_1.8s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
    </div>
  );
}
