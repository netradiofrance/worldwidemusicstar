import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const revalidate = 300;
export const metadata = {
  title: 'Chart Archives',
  description: 'Browse the full history of WorldWide Music Star monthly charts and award winners.',
};

interface ArchiveRow {
  id: string;
  period_year: number;
  period_month: number;
  genre: string | null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default async function ArchivesPage() {
  const sb = createServerClient();
  const { data } = await sb
    .from('chart_archives')
    .select('id, period_year, period_month, genre')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(500);

  // Group by period
  const grouped = new Map<string, ArchiveRow[]>();
  for (const row of (data ?? []) as ArchiveRow[]) {
    const key = `${row.period_year}-${String(row.period_month).padStart(2,'0')}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  return (
    <section>
      <div className="border-b border-white/5 bg-ambient-red">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">History</div>
          <h1 className="font-display uppercase text-5xl sm:text-7xl tracking-tightest mb-3">
            Chart archives
          </h1>
          <p className="text-ink-200 text-lg max-w-2xl">
            Every month, the live charts are frozen and archived. Browse past rankings and award winners.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {grouped.size === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-ink-800 p-10 text-center">
            <h2 className="font-display uppercase text-3xl mb-3">No archives yet</h2>
            <p className="text-ink-300 max-w-md mx-auto">
              Archives are created on the 1st of each month. The first snapshot will appear here soon.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Array.from(grouped.entries()).map(([key, rows]) => {
              const [y, m] = key.split('-').map(Number);
              return (
                <div key={key}>
                  <h2 className="font-display uppercase text-2xl mb-4 text-white">
                    {MONTHS[m - 1]} {y}
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {rows.map(r => {
                      const label = r.genre ? (GENRE_BY_SLUG[r.genre]?.name ?? r.genre) : 'All Charts';
                      return (
                        <Link
                          key={r.id}
                          href={`/archives/${y}-${String(m).padStart(2,'0')}/${r.genre ?? 'all'}`}
                          className="block rounded-lg bg-ink-800 border border-white/5 hover:border-brand/40 px-4 py-3 transition-colors"
                        >
                          <div className="text-[11px] uppercase tracking-widest text-brand mb-1">{label}</div>
                          <div className="text-sm text-ink-200">View ranking →</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
