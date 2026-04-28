'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PUBLIC_GENRES } from '@/lib/genres';
import { Search, Check, Loader2 } from 'lucide-react';
import type { GenreSlug } from '@/lib/database.types';

interface SpotifySearchHit {
  id: string;
  name: string;
  artist_name: string;
  artist_id: string;
  album_cover_url: string | null;
  external_url: string;
}

const PRICE_USD = Number(process.env.NEXT_PUBLIC_ENTRY_PRICE_USD ?? '99.99');

export function AddSongForm() {
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<SpotifySearchHit[]>([]);
  const [chosen, setChosen] = useState<SpotifySearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [genre, setGenre] = useState<GenreSlug | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // debounced search
  useEffect(() => {
    if (chosen) return;
    if (search.trim().length < 2) { setHits([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (!cancelled) setHits(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, chosen]);

  function selectHit(h: SpotifySearchHit) {
    setChosen(h);
    setHits([]);
    setSearch(`${h.artist_name} — ${h.name}`);
  }

  function clearChoice() {
    setChosen(null);
    setSearch('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !genre || !youtubeUrl) {
      setError('Please complete every field.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/payment/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          genre,
          artistName: chosen?.artist_name ?? '',
          songTitle: chosen?.name ?? '',
          spotifyTrackId: chosen?.id ?? null,
          spotifyUrl: chosen?.external_url ?? null,
          coverUrl: chosen?.album_cover_url ?? null,
          spotifyArtistId: chosen?.artist_id ?? null,
          youtubeUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.approveUrl) {
        setError(data.error ?? 'Payment could not be initialized.');
        setSubmitting(false);
        return;
      }
      // Redirect to PayPal approval URL
      window.location.href = data.approveUrl;
    } catch (err) {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-ink-800 border border-white/10 p-6 sm:p-8 space-y-6">
      {/* Email */}
      <div>
        <label className="block text-sm font-semibold mb-2">Your email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full rounded-lg bg-ink-700 border border-white/10 px-4 py-3 text-white placeholder-ink-400 focus:border-brand"
        />
        <p className="text-xs text-ink-400 mt-2">Used for confirmation and chart updates. Never shared.</p>
      </div>

      {/* Spotify search */}
      <div>
        <label className="block text-sm font-semibold mb-2">Find your song on Spotify</label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); if (chosen) setChosen(null); }}
            placeholder="Type artist name or song title…"
            className="w-full rounded-lg bg-ink-700 border border-white/10 px-4 py-3 pl-11 text-white placeholder-ink-400 focus:border-brand"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          {searching && (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 animate-spin" />
          )}
          {chosen && (
            <button type="button" onClick={clearChoice} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-300 hover:text-white">
              Clear
            </button>
          )}

          {!chosen && hits.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-ink-800 border border-white/10 rounded-lg shadow-xl max-h-80 overflow-auto">
              {hits.map(h => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => selectHit(h)}
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-ink-700 transition-colors"
                  >
                    {h.album_cover_url ? (
                      <Image src={h.album_cover_url} alt="" width={40} height={40} className="rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-ink-600" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{h.name}</div>
                      <div className="text-xs text-ink-300 truncate">{h.artist_name}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {chosen && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-ink-700/60 rounded-lg border border-emerald-500/30">
            <Check size={16} className="text-emerald-400 shrink-0" />
            {chosen.album_cover_url && (
              <Image src={chosen.album_cover_url} alt="" width={36} height={36} className="rounded" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{chosen.name}</div>
              <div className="text-xs text-ink-300 truncate">{chosen.artist_name}</div>
            </div>
          </div>
        )}
        <p className="text-xs text-ink-400 mt-2">
          The cover art and Spotify link are imported automatically. If your track is not on Spotify yet, you can still submit — leave this empty.
        </p>
      </div>

      {/* YouTube URL */}
      <div>
        <label className="block text-sm font-semibold mb-2">YouTube video URL</label>
        <input
          type="url"
          value={youtubeUrl}
          onChange={e => setYoutubeUrl(e.target.value)}
          required
          placeholder="https://www.youtube.com/watch?v=…"
          className="w-full rounded-lg bg-ink-700 border border-white/10 px-4 py-3 text-white placeholder-ink-400 focus:border-brand"
        />
        <p className="text-xs text-ink-400 mt-2">Your YouTube subscribers count is fetched from the video&apos;s channel.</p>
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-semibold mb-2">Genre</label>
        <select
          required
          value={genre}
          onChange={e => setGenre(e.target.value as GenreSlug)}
          className="w-full rounded-lg bg-ink-700 border border-white/10 px-4 py-3 text-white focus:border-brand"
        >
          <option value="">Select a genre…</option>
          {PUBLIC_GENRES.map(g => (
            <option key={g.slug} value={g.slug}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Pricing */}
      <div className="rounded-xl bg-ink-700/50 border border-white/5 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-ink-200">Chart entry — flat fee</div>
          <div className="font-display text-3xl text-brand">${PRICE_USD.toFixed(2)}</div>
        </div>
        <ul className="text-xs text-ink-300 space-y-1 mt-2">
          <li>• Live ranking on your genre chart</li>
          <li>• Eligible for the monthly $WorldWide Music Star award</li>
          <li>• Auto-tracked Spotify and YouTube counters</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-4 text-lg transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {submitting ? <><Loader2 size={18} className="animate-spin" /> Redirecting to PayPal…</> : `Pay $${PRICE_USD.toFixed(2)} via PayPal`}
      </button>
      <p className="text-xs text-ink-400 text-center">
        Secure payment via PayPal. Stripe support coming soon.
      </p>
    </form>
  );
}
