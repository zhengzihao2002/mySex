'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Pulls your partner's latest changes when the app comes back to the foreground.
 * No background polling, so Neon's free-tier compute can scale to zero.
 */
export function RefreshOnFocus() {
  const router = useRouter();
  const last = useRef(Date.now());
  useEffect(() => {
    const onVisible = () => {
      // Preserve the open editor and its unsaved notes/pin when returning from another app or tab.
      if (document.querySelector('[data-session-editor]')) return;
      if (document.visibilityState === 'visible' && Date.now() - last.current > 5000) {
        last.current = Date.now();
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [router]);
  return null;
}
