'use client';

import { useEffect, useState } from 'react';

/**
 * Periodically reloads the page until the server-rendered output
 * indicates that the track has been activated. Uses
 * window.location.reload() because Next.js App Router's
 * router.refresh() does not always force a visible re-render in
 * production (the cached client tree can stay identical even when
 * the server data has changed).
 *
 * A small "Checking again in N seconds…" countdown shows that the
 * page is alive and gives the user predictability.
 */
export function PendingAutoRefresh({ intervalSeconds = 6 }: { intervalSeconds?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);

  useEffect(() => {
    // Per-second tick for the countdown display
    const tick = setInterval(() => {
      setSecondsLeft(s => (s > 1 ? s - 1 : intervalSeconds));
    }, 1000);

    // Hard reload on the configured interval
    const reloadTimer = setInterval(() => {
      window.location.reload();
    }, intervalSeconds * 1000);

    return () => {
      clearInterval(tick);
      clearInterval(reloadTimer);
    };
  }, [intervalSeconds]);

  return (
    <p className="text-ink-400 text-xs mt-4 tabular-nums">
      Checking again in {secondsLeft}s…
    </p>
  );
}
