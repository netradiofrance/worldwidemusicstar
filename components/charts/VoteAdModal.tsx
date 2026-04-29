'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      ima?: any;
    };
  }
}

interface Props {
  onClose: () => void;
  onCompleted: (adSessionId: string) => void;
}

/**
 * VoteAdModal renders a Google IMA SDK ad container and starts the
 * VAST tag from env. When the ad fires the COMPLETE event, the parent
 * receives an adSessionId which the parent then sends to /api/votes/cast.
 *
 * If IMA fails to load, we show an explicit error and a Close button.
 *
 * IMPORTANT — z-index/pointer-events note:
 *   When the ad cannot be played, the IMA SDK leaves its overlay <div>
 *   in place. That overlay is positioned absolute and intercepts every
 *   click on the modal area, including our error-state Close button.
 *   We work around this by:
 *     1. Setting pointer-events:none on the IMA container in error state.
 *     2. Bumping the error overlay above it with z-30.
 *     3. Adding a top-right close button outside the player area (header).
 *
 * Make sure the Google IMA SDK <script> tag is loaded in app/layout.tsx.
 */
export function VoteAdModal({ onClose, onCompleted }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adSessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let adsManager: any = null;
    let adsLoader: any = null;
    let adDisplayContainer: any = null;
    let cancelled = false;

    function fail(msg: string) {
      if (cancelled) return;
      setError(msg);
      setLoading(false);
    }

    async function start() {
      // wait for IMA SDK to be present
      let tries = 0;
      while (!window.google?.ima && tries < 60) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
      if (!window.google?.ima) return fail('Ad library failed to load');

      const ima = window.google.ima;
      if (!containerRef.current || !videoRef.current) return fail('Player not ready');

      adDisplayContainer = new ima.AdDisplayContainer(
        containerRef.current,
        videoRef.current,
      );
      adDisplayContainer.initialize();

      adsLoader = new ima.AdsLoader(adDisplayContainer);
      adsLoader.addEventListener(
        ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e: any) => {
          adsManager = e.getAdsManager(videoRef.current);
          adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (err: any) => {
            const msg = err.getError ? err.getError().toString() : 'Ad error';
            console.error('[IMA] ad error:', msg);
            fail('Ad could not be played');
          });
          adsManager.addEventListener(ima.AdEvent.Type.LOADED, () => setLoading(false));
          adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => setLoading(false));
          adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
            if (!cancelled) onCompleted(adSessionId);
          });
          adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
            if (!cancelled) onClose();
          });
          try {
            adsManager.init(640, 360, ima.ViewMode.NORMAL);
            adsManager.start();
            videoRef.current?.play().catch(() => {});
          } catch (e: any) {
            console.error('[IMA] init/start error:', e);
            fail('Ad could not start');
          }
        },
        false,
      );
      adsLoader.addEventListener(
        ima.AdErrorEvent.Type.AD_ERROR,
        (err: any) => {
          console.error('[IMA] loader error:', err.getError?.());
          fail('Ad could not be loaded');
        },
        false,
      );

      const adsRequest = new ima.AdsRequest();
      const tag = (process.env.NEXT_PUBLIC_VAST_TAG_URL ?? '').replace(
        '[timestamp]',
        Date.now().toString(),
      );
      adsRequest.adTagUrl = tag;
      adsRequest.linearAdSlotWidth = 640;
      adsRequest.linearAdSlotHeight = 360;
      adsRequest.nonLinearAdSlotWidth = 640;
      adsRequest.nonLinearAdSlotHeight = 150;
      adsLoader.requestAds(adsRequest);
    }

    start();

    return () => {
      cancelled = true;
      try { adsManager?.destroy?.(); } catch {}
      try { adsLoader?.destroy?.(); } catch {}
      try { adDisplayContainer?.destroy?.(); } catch {}
    };
  }, [adSessionId, onClose, onCompleted]);

  // ESC key closes the modal — accessibility + bulletproof escape route
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      // Click on the dark backdrop closes the modal
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-ink-900 border border-white/10 overflow-hidden">
        {/* HEADER — always above everything else, always clickable */}
        <div className="relative z-40 flex items-center justify-between p-4 border-b border-white/5 bg-ink-900">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-300">Watch this ad</div>
            <div className="text-white font-semibold">…to validate your vote</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-300 hover:text-white p-2 -mr-2 rounded-full hover:bg-white/5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative bg-black aspect-video">
          {/*
            The IMA SDK paints overlays into this container.
            When we are in error state we set pointer-events:none on it so
            its leftover overlay does not eat clicks meant for the Close
            button below.
          */}
          <div
            ref={containerRef}
            className="absolute inset-0 z-10"
            style={{ pointerEvents: error ? 'none' : 'auto' }}
          />
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full"
            playsInline
            muted={false}
            style={{ pointerEvents: error ? 'none' : 'auto' }}
          />
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-ink-300 text-sm pointer-events-none">
              Loading ad…
            </div>
          )}
          {error && (
            // z-30 puts this above the IMA container (z-10).
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 p-6 text-center bg-ink-900/95">
              <p className="text-ink-100 font-medium">Sorry, the ad could not be played.</p>
              <p className="text-ink-300 text-sm max-w-md">
                Please try again. If the problem persists, refresh the page.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-full bg-ink-700 hover:bg-ink-600 px-5 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>
          )}
        </div>

        <div className="relative z-40 p-4 text-center text-xs text-ink-400 bg-ink-900">
          Your vote will be registered automatically when the ad finishes.
        </div>
      </div>
    </div>
  );
}
