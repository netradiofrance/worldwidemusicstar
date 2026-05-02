'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mounts a periodic `router.refresh()` so the surrounding server component
 * can re-fetch and re-render. Used on /add-a-song/success while a track
 * is still in pending_payment state — once the webhook lands and the
 * server detects status === 'active', it returns the celebratory view
 * instead and this component is no longer rendered, ending the loop.
 *
 * router.refresh() (Next.js App Router) re-runs the server component
 * tree without a full page reload, so React state and scroll position
 * are preserved.
 */
export function PendingAutoRefresh({ intervalMs = 6000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  // Render nothing — pure side-effect component
  return null;
}
