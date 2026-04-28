import { createServerClient } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function AdminAwardsPage() {
  const sb = createServerClient();
  const [{ data: awards }, { data: archives }] = await Promise.all([
    sb.from('awards').select('*, tracks(*)').order('period_year', { ascending: false }).order('period_month', { ascending: false }),
    sb.from('chart_archives').select('id, period_year, period_month, genre').order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(100),
  ]);

  return (
    <div>
      <h1 className="font-display uppercase text-4xl tracking-tightest mb-2">Awards & Archives</h1>
      <p className="text-ink-300 mb-8">Monthly snapshots run automatically on the 1st of each month.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display uppercase text-xl mb-3">Awards</h2>
          <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-300">
                <tr>
                  <th className="text-left px-4 py-3">Period</th>
                  <th className="text-left px-4 py-3">Winner</th>
                  <th className="text-right px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {(awards ?? []).map((a: any) => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-ink-200">{MONTHS[a.period_month - 1]} {a.period_year}</td>
                    <td className="px-4 py-3 text-white">{a.tracks?.artist_name ?? '—'} — {a.tracks?.song_title ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-200">{Math.round(a.score)}</td>
                  </tr>
                ))}
                {(!awards || awards.length === 0) && (
                  <tr><td colSpan={3} className="text-center text-ink-400 py-10">No awards yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-display uppercase text-xl mb-3">Archives</h2>
          <div className="rounded-xl bg-ink-900 border border-white/5 max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-300 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3">Period</th>
                  <th className="text-left px-4 py-3">Scope</th>
                  <th className="text-right px-4 py-3">Open</th>
                </tr>
              </thead>
              <tbody>
                {(archives ?? []).map(a => {
                  const period = `${a.period_year}-${String(a.period_month).padStart(2,'0')}`;
                  const scope = a.genre ?? 'all';
                  return (
                    <tr key={a.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-ink-200">{period}</td>
                      <td className="px-4 py-3 text-ink-300 capitalize">{scope}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/archives/${period}/${scope}`} target="_blank" className="text-brand text-xs font-semibold hover:underline">View →</Link>
                      </td>
                    </tr>
                  );
                })}
                {(!archives || archives.length === 0) && (
                  <tr><td colSpan={3} className="text-center text-ink-400 py-10">No archives yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
