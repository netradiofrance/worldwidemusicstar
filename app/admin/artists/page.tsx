import { createServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { GENRE_BY_SLUG } from '@/lib/genres';
import { formatNumber } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export default async function AdminArtistsPage() {
  const sb = createServerClient();
  const { data: tracks } = await sb
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display uppercase text-4xl tracking-tightest mb-1">Artists & Tracks</h1>
          <p className="text-ink-300">Manage every entry in the database.</p>
        </div>
        <Link href="/admin/artists/new" className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-5 py-2.5 text-sm">
          + Add manual entry
        </Link>
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-300">
            <tr>
              <th className="text-left px-4 py-3">Artist</th>
              <th className="text-left px-4 py-3">Song</th>
              <th className="text-left px-4 py-3">Genre</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Votes</th>
              <th className="text-right px-4 py-3">Score</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tracks ?? []).map(t => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">{t.artist_name}</td>
                <td className="px-4 py-3 text-ink-200">{t.song_title}</td>
                <td className="px-4 py-3 text-ink-300">{GENRE_BY_SLUG[t.genre]?.name}</td>
                <td className="px-4 py-3">
                  <span className={[
                    'text-[10px] uppercase tracking-wider rounded-full px-2 py-1 font-semibold',
                    t.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' :
                    t.status === 'pending_payment' ? 'bg-amber-500/15 text-amber-300' :
                    t.status === 'archived' ? 'bg-ink-700 text-ink-300' :
                    'bg-red-500/15 text-red-300',
                  ].join(' ')}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-200">{formatNumber(t.votes_count)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-200">{formatNumber(Math.round(t.score))}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/artists/${t.id}`} className="text-brand text-xs font-semibold hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {(!tracks || tracks.length === 0) && (
              <tr><td colSpan={7} className="text-center text-ink-400 py-10">No tracks yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
