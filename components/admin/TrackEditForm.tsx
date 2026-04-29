'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Check, Loader2 } from 'lucide-react';
import { PUBLIC_GENRES } from '@/lib/genres';
import type { Track } from '@/lib/database.types';

interface SpotifySearchHit {
  id: string;
  name: string;
  artist_name: string;
  artist_id: string;
  album_cover_url: string | null;
  external_url: string;
}

export function TrackEditForm({ track }: { track: Track | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    artist_name: track?.artist_name ?? '',
    song_title: track?.song_title ?? '',
    genre: track?.genre ?? 'pop',
    email: track?.email ?? 'admin@worldwidemusicstar.com',
    spotify_url: track?.spotify_url ?? '',
    spotify_track_id: track?.spotify_track_id ?? '',
    cover_url: track?.cover_url ?? '',
    youtube_url: track?.youtube_url ?? '',
    spotify_followers: track?.spotify_followers ?? 0,
    youtube_subscribers: track?.youtube_subscribers ?? 0,
    votes_count: track?.votes_count ?? 0,
    status: track?.status ?? 'active',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // --- Spotify search state ---
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<SpotifySearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [chosenHit, setChosenHit] = useState<SpotifySearchHit | null>(null);

  useEffect(() => {
    if (chosenHit) return;
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
  }, [search, chosenHit]);

  function selectHit(h: SpotifySearchHit) {
    setChosenHit(h);
    setHits([]);
    setSearch(`${h.artist_name} — ${h.name}`);
    // Pre-fill form fields with Spotify data
    setForm(s => ({
      ...s,
      artist_name: h.artist_name,
      song_title: h.name,
      spotify_track_id: h.id,
      spotify_url: h.external_url,
      cover_url: h.album_cover_url ?? s.cover_url,
    }));
  }

  function clearChoice() {
    setChosenHit(null);
    setSearch('');
  }

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm(s => ({ ...s, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(track ? `/api/admin/tracks/${track.id}` : '/api/admin/tracks', {
        method: track ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j.error ?? 'Save failed');
      } else {
        setMsg('Saved.');
        router.refresh();
        if (!track) {
          const j = await res.json();
          if (j?.id) router.push(`/admin/artists/${j.id}`);
        }
      }
    } catch (e) {
      setMsg('Network error');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!track) return;
    if (!confirm('Delete this entry permanently?')) return;
    const res = await fetch(`/api/admin/tracks/${track.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/artists');
  }

  return (
    <form onSubmit={save} className="space-y-5 bg-ink-900 border border-white/5 rounded-xl p-6">
      {/* Spotify search box — pre-fills the form fields below */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Find on Spotify <span className="text-ink-400 font-normal">(pre-fills artist, title, cover)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); if (chosenHit) setChosenHit(null); }}
            placeholder="Type artist name or song title…"
            className="input pl-11"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          {searching && (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 animate-spin" />
          )}
          {chosenHit && (
            <button type="button" onClick={clearChoice} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-300 hover:text-white">
              Clear
            </button>
          )}

          {!chosenHit && hits.length > 0 && (
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

        {chosenHit && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-ink-700/60 rounded-lg border border-emerald-500/30">
            <Check size={16} className="text-emerald-400 shrink-0" />
            {chosenHit.album_cover_url && (
              <Image src={chosenHit.album_cover_url} alt="" width={36} height={36} className="rounded" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{chosenHit.name}</div>
              <div className="text-xs text-ink-300 truncate">{chosenHit.artist_name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Cover preview, if any */}
      {form.cover_url && (
        <div className="flex items-center gap-3 p-3 bg-ink-800 rounded-lg">
          <Image src={form.cover_url} alt="Cover" width={56} height={56} className="rounded" />
          <div className="text-xs text-ink-300 truncate flex-1">{form.cover_url}</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Artist name" value={form.artist_name} onChange={v => update('artist_name', v)} required />
        <Field label="Song title" value={form.song_title} onChange={v => update('song_title', v)} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Genre</label>
          <select className="input" value={form.genre} onChange={e => update('genre', e.target.value)}>
            {PUBLIC_GENRES.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Status</label>
          <select className="input" value={form.status} onChange={e => update('status', e.target.value)}>
            <option value="pending_payment">pending_payment</option>
            <option value="active">active</option>
            <option value="rejected">rejected</option>
            <option value="archived">archived</option>
          </select>
        </div>
      </div>
      <Field label="Email (contact)" value={form.email} onChange={v => update('email', v)} type="email" required />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Spotify URL" value={form.spotify_url} onChange={v => update('spotify_url', v)} />
        <Field label="Spotify track ID" value={form.spotify_track_id} onChange={v => update('spotify_track_id', v)} />
      </div>
      <Field label="Cover image URL" value={form.cover_url} onChange={v => update('cover_url', v)} />
      <Field label="YouTube URL" value={form.youtube_url} onChange={v => update('youtube_url', v)} />
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Votes" type="number" value={String(form.votes_count)} onChange={v => update('votes_count', Number(v))} />
        <Field label="Spotify followers" type="number" value={String(form.spotify_followers)} onChange={v => update('spotify_followers', Number(v))} />
        <Field label="YouTube subscribers" type="number" value={String(form.youtube_subscribers)} onChange={v => update('youtube_subscribers', Number(v))} />
      </div>

      {msg && <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm">{msg}</div>}

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        {track ? (
          <button type="button" onClick={del} className="text-red-300 text-sm hover:text-red-200">Delete entry</button>
        ) : <span />}
        <button type="submit" disabled={busy} className="rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2.5 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: #1A1A1A;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fff;
        }
      `}</style>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="input"
      />
    </div>
  );
}
