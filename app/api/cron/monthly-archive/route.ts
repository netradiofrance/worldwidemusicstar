import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase';
import { PUBLIC_GENRES } from '@/lib/genres';
import type { GenreSlug, Track, ArchivedRanking } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Runs on the 1st of each month at 00:05.
 * - Computes the period for the JUST-ENDED month (previous month).
 * - Snapshots the top 50 of each genre + top 50 overall into chart_archives.
 * - Records the monthly award winner (overall #1 of the just-ended month).
 *
 * Scoring is based on the cumulative score over the month — for the MVP
 * we use the current `score` value as a proxy. A future improvement is
 * to track per-month deltas (votes, follower gains) to rank fairly.
 */
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}

async function run() {
  const sb = createServerClient();

  // The month that just ended.
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodYear = prev.getUTCFullYear();
  const periodMonth = prev.getUTCMonth() + 1;

  // Pull all active tracks
  const { data: allTracks, error } = await sb
    .from('tracks')
    .select('*')
    .eq('status', 'active')
    .order('score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!allTracks || allTracks.length === 0) {
    return NextResponse.json({ ok: true, message: 'No active tracks to archive' });
  }

  function toRanking(rows: Track[]): ArchivedRanking[] {
    return rows.slice(0, 50).map((t, i) => ({
      rank: i + 1,
      track_id: t.id,
      artist: t.artist_name,
      song: t.song_title,
      score: t.score,
      votes: t.votes_count,
      spotify: t.spotify_followers,
      youtube: t.youtube_subscribers,
      cover_url: t.cover_url,
    }));
  }

  // Overall snapshot
  await sb.from('chart_archives').upsert({
    period_year: periodYear,
    period_month: periodMonth,
    genre: null,
    ranking: toRanking(allTracks as Track[]),
  }, { onConflict: 'period_year,period_month,genre' });

  // Per-genre snapshots
  for (const g of PUBLIC_GENRES) {
    const rows = (allTracks as Track[]).filter(t => t.genre === g.slug as GenreSlug);
    if (rows.length === 0) continue;
    await sb.from('chart_archives').upsert({
      period_year: periodYear,
      period_month: periodMonth,
      genre: g.slug as GenreSlug,
      ranking: toRanking(rows),
    }, { onConflict: 'period_year,period_month,genre' });
  }

  // Award the month's overall #1
  const winner = allTracks[0] as Track;
  await sb.from('awards').upsert({
    period_year: periodYear,
    period_month: periodMonth,
    track_id: winner.id,
    votes_count: winner.votes_count,
    score: winner.score,
  }, { onConflict: 'period_year,period_month' });

  return NextResponse.json({
    ok: true,
    period: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    archived_genres: PUBLIC_GENRES.length + 1,
    award_winner: { track_id: winner.id, artist: winner.artist_name, song: winner.song_title },
  });
}
