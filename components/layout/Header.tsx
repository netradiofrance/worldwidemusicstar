'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { PUBLIC_GENRES } from '@/lib/genres';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-white/5 bg-ink-900/95 backdrop-blur supports-[backdrop-filter]:bg-ink-900/80 sticky top-0 z-40">
      {/* Top row */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="WorldWide Music Star — Home">
            <Image src="/logo.png" alt="WorldWide Music Star" width={220} height={52} priority className="h-9 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-ink-200">
            <Link href="/charts/all" className="hover:text-white transition-colors">All Charts</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Music Blog</Link>
            <Link href="/archives" className="hover:text-white transition-colors">Archives</Link>
          </nav>

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
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Genre nav row */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto h-12 text-sm">
            <Link
              href="/charts/all"
              className="px-3 py-1.5 rounded-md text-ink-100 hover:text-white hover:bg-white/5 font-semibold tracking-wide whitespace-nowrap"
            >
              All Charts
            </Link>
            <span className="w-px h-4 bg-white/10 mx-2" aria-hidden />
            {PUBLIC_GENRES.map(g => (
              <Link
                key={g.slug}
                href={`/charts/${g.slug}`}
                className="px-3 py-1.5 rounded-md text-ink-200 hover:text-white hover:bg-white/5 whitespace-nowrap"
              >
                {g.name}
              </Link>
            ))}
            <span className="w-px h-4 bg-white/10 mx-2" aria-hidden />
            <Link
              href="/blog"
              className="px-3 py-1.5 rounded-md text-ink-200 hover:text-white hover:bg-white/5 whitespace-nowrap"
            >
              Music Blog
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-white/5 bg-ink-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 grid grid-cols-2 gap-2">
            <Link href="/charts/all" className="px-3 py-2 rounded-md hover:bg-white/5" onClick={() => setMenuOpen(false)}>All Charts</Link>
            {PUBLIC_GENRES.map(g => (
              <Link key={g.slug} href={`/charts/${g.slug}`} className="px-3 py-2 rounded-md hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                {g.name}
              </Link>
            ))}
            <Link href="/blog" className="px-3 py-2 rounded-md hover:bg-white/5" onClick={() => setMenuOpen(false)}>Music Blog</Link>
            <Link href="/archives" className="px-3 py-2 rounded-md hover:bg-white/5" onClick={() => setMenuOpen(false)}>Archives</Link>
            <Link href="/add-a-song" className="col-span-2 mt-2 px-3 py-2.5 rounded-full bg-brand text-white text-center font-semibold" onClick={() => setMenuOpen(false)}>
              Add a Song
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
