import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerClient } from '@/lib/supabase';
import { GENRE_BY_SLUG } from '@/lib/genres';
import { CoverImage } from '@/components/charts/CoverImage';
import { formatNumber } from '@/lib/scoring';
import type { ArchivedRanking, ChartArchive } from '@/lib/database.types';

export const revalidate = 3600;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface PageProps { params: Promise<{ period: string; scope: string }> }

export default async function ArchivePage({ params }: PageProps) {
  const { period, scope } = await params;
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) notFound();
  const year = Number(m[1]);
  const month = Number(m[2]);

  // Build the query in two steps so TypeScript can infer the row type
  // correctly. Mixing `.is()` and `.eq()` in a ternary returns a union
  // that the type-checker collapses to `never`, which is the bug we hit.
  const sb = createServerClient();
  let archive: ChartArchive | null = null;

  if (scope === 'all') {
    const { data } = await sb
      .from('chart_archives')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .is('genre', null)
      .maybeSingle();
    archive = (data as ChartArchive | null) ?? null;
  } else {
    const { data } = await sb
      .from('chart_archives')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .eq('genre', scope as any)
      .maybeSingle();
    archive = (data as ChartArchive | null) ?? null;
  }

  if (!archive) notFound();

  const label = scope === 'all' ? 'All Charts' : (GENRE_BY_SLUG[scope]?.name ?? scope);
  const ranking: ArchivedRanking[] = Array.isArray(archive.ranking) ? archive.ranking : [];

  return (
    <article>
      <div className="border-b border-white/5 bg-ambient-red">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-14">
          <Link href="/archives" className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white mb-6">
            <ArrowLeft size={14} /> All archives
          </Link>
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">
            Archived snapshot
          </div>
          <h1 className="font-display uppercase text-4xl sm:text-6xl tracking-tightest mb-3">
            {label} · {MONTHS[month - 1]} {year}
          </h1>
          <p className="text-ink-200">Frozen ranking from the end of the period.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {ranking.length === 0 ? (
          <p className="text-center text-ink-400 py-10">This archive is empty.</p>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink-800/50 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[64px_72px_1fr_repeat(3,minmax(80px,auto))] gap-4 px-5 py-3 border-b border-white/10 text-[10px] uppercase tracking-widest text-ink-400 font-semibold">
              <div className="text-center">Rank</div>
              <div></div>
              <div>Track</div>
              <div className="text-center">Votes</div>
              <div className="text-center">Spotify</div>
              <div className="text-center">YouTube</div>
            </div>
            {ranking.map(r => (
              <div key={r.track_id + r.rank} className="grid grid-cols-[48px_64px_1fr] sm:grid-cols-[64px_72px_1fr_repeat(3,minmax(80px,auto))] items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 border-b border-white/5">
                <div className="text-center font-display text-2xl sm:text-3xl text-ink-100">{r.rank}</div>
                <CoverImage src={r.cover_url} alt={r.artist} size={56} className="hidden sm:block" />
                <CoverImage src={r.cover_url} alt={r.artist} size={48} className="sm:hidden" />
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{r.song}</div>
                  <div className="text-sm text-ink-300 truncate">{r.artist}</div>
                </div>
                <div className="hidden sm:block text-center tabular-nums">{formatNumber(r.votes)}</div>
                <div className="hidden sm:block text-center tabular-nums">{formatNumber(r.spotify)}</div>
                <div className="hidden sm:block text-center tabular-nums">{formatNumber(r.youtube)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
