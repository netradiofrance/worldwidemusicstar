import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase';
import { getVideoInfo, getChannelSubscribers } from '@/lib/youtube';
import { computeScore } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return runRefresh();
}
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return runRefresh();
}

async function runRefresh() {
  const sb = createServerClient();
  const { data: tracks, error } = await sb
    .from('tracks')
    .select('id, youtube_video_id, youtube_channel_id, votes_count, spotify_followers, youtube_subscribers')
    .eq('status', 'active');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0, skipped = 0;
  // Cache channel subscriber lookups per-run to save quota
  const channelCache = new Map<string, number>();

  for (const t of tracks ?? []) {
    if (!t.youtube_video_id) { skipped++; continue; }
    try {
      let channelId = t.youtube_channel_id;
      if (!channelId) {
        const info = await getVideoInfo(t.youtube_video_id);
        if (!info) { skipped++; continue; }
        channelId = info.channelId;
        await sb.from('tracks').update({ youtube_channel_id: channelId }).eq('id', t.id);
      }
      const subs = channelCache.has(channelId)
        ? channelCache.get(channelId)!
        : await getChannelSubscribers(channelId);
      channelCache.set(channelId, subs);

      const score = computeScore({
        votes_count: t.votes_count ?? 0,
        spotify_followers: t.spotify_followers ?? 0,
        youtube_subscribers: subs,
      });
      await sb.from('tracks').update({
        youtube_subscribers: subs,
        youtube_subscribers_updated_at: new Date().toISOString(),
        score,
      }).eq('id', t.id);
      updated++;
    } catch (e) {
      console.error('[youtube/refresh] track failed', t.id, e);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, updated, skipped, total: tracks?.length ?? 0 });
}
