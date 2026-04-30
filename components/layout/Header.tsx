'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { PUBLIC_GENRES } from '@/lib/genres';

/**
 * Site header.
 *
 * Two layouts:
 *   - lg+   :  Logo + main links + "Genres ▾" mega-menu trigger + Add a Song.
 *              The mega-menu opens as a full-width panel below the header
 *              and shows every genre as a colored card.
 *   - <lg   :  Logo + hamburger. The hamburger opens a slide-down drawer
 *              with main links and a 2-col grid of all genres.
 *
 * The genre list scaled past the point where a single horizontal nav
 * row could hold them; the mega-menu approach keeps things tidy at any
 * screen width and gives each genre visual weight via its accent color.
 */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement | null>(null);

  // Close the mega-menu on outside click / ESC for accessibility
  useEffect(() => {
    if (!megaOpen) return;
    function onClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMegaOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [megaOpen]);

  return (
    <header className="border-b border-white/5 bg-ink-900/95 backdrop-blur supports-[backdrop-filter]:bg-ink-900/80 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="WorldWide Music Star — Home">
          <Image src="/logo.png" alt="WorldWide Music Star" width={220} height={52} priority className="h-9 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-ink-200">
          <Link
            href="/charts/all"
            className="px-3 py-2 rounded-md hover:text-white hover:bg-white/5 transition-colors"
          >
            All Charts
          </Link>

          {/* Genres trigger */}
          <div className="relative" ref={megaRef}>
            <button
              type="button"
              onClick={() => setMegaOpen(o => !o)}
              aria-expanded={megaOpen}
              aria-haspopup="true"
              className={[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors',
                megaOpen ? 'bg-white/10 text-white' : 'hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              Genres
              <ChevronDown
                size={14}
                className={`transition-transform ${megaOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Mega-menu — anchored to the trigger but full-width visually */}
            {megaOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-screen max-w-[min(960px,calc(100vw-2rem))] rounded-2xl bg-ink-900 border border-white/10 shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-2 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-brand mb-1">All genres</div>
                    <div className="text-white font-display uppercase text-xl tracking-tightest">Pick a chart</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMegaOpen(false)}
                    className="text-ink-400 hover:text-white p-2 -mr-2"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {PUBLIC_GENRES.map(g => (
                    <Link
                      key={g.slug}
                      href={`/charts/${g.slug}`}
                      onClick={() => setMegaOpen(false)}
                      className="group flex items-center gap-3 rounded-lg p-3 hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    >
                      {/* Color dot — uses the genre's accent class */}
                      <span className={`block w-2.5 h-2.5 rounded-full ${g.bgClass} shrink-0 group-hover:scale-110 transition-transform`} aria-hidden />
                      <span className="text-sm font-medium text-ink-100 group-hover:text-white truncate">
                        {g.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/blog"
            className="px-3 py-2 rounded-md hover:text-white hover:bg-white/5 transition-colors"
          >
            Music Blog
          </Link>
          <Link
            href="/archives"
            className="px-3 py-2 rounded-md hover:text-white hover:bg-white/5 transition-colors"
          >
            Archives
          </Link>
        </nav>

        {/* Right cluster — Add a Song + mobile hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/add-a-song"
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark transition-colors text-white text-sm font-semibold px-5 py-2.5"
          >
            Add a Song
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-ink-100"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/5 bg-ink-900 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 space-y-4">
            <div className="flex flex-col gap-1 text-sm">
              <Link
                href="/charts/all"
                className="px-3 py-2.5 rounded-md hover:bg-white/5 font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                All Charts
              </Link>
              <Link
                href="/blog"
                className="px-3 py-2.5 rounded-md hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                Music Blog
              </Link>
              <Link
                href="/archives"
                className="px-3 py-2.5 rounded-md hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                Archives
              </Link>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-400 px-3 mb-2">Genres</div>
              <div className="grid grid-cols-2 gap-1">
                {PUBLIC_GENRES.map(g => (
                  <Link
                    key={g.slug}
                    href={`/charts/${g.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-white/5 text-sm"
                  >
                    <span className={`block w-2 h-2 rounded-full ${g.bgClass} shrink-0`} aria-hidden />
                    <span className="text-ink-100 truncate">{g.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/add-a-song"
              className="block text-center mt-2 px-3 py-3 rounded-full bg-brand text-white font-semibold"
              onClick={() => setMobileOpen(false)}
            >
              Add a Song
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
