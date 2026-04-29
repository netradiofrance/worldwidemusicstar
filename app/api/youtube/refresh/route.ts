import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase';
import {
  getChannelSubscribers,
  resolveAnyYoutubeUrlToChannelId,
} from '@/lib/youtube';
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
    .select('id, youtube_url, youtube_video_id, youtube_channel_id, votes_count, spotify_followers, youtube_subscribers')
    .eq('status', 'active');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0, skipped = 0, resolved = 0;
  // Cache channel subscriber lookups per-run to save quota
  const channelCache = new Map<string, number>();

  for (const t of tracks ?? []) {
    if (!t.youtube_url) { skipped++; continue; }

    try {
      // 1. Find or resolve a channel id for this track
      let channelId = t.youtube_channel_id;
      let videoId = t.youtube_video_id;

      if (!channelId) {
        const resolvedRes = await resolveAnyYoutubeUrlToChannelId(t.youtube_url);
        channelId = resolvedRes.channelId;
        if (!videoId && resolvedRes.videoId) videoId = resolvedRes.videoId;

        if (channelId) {
          // Persist the resolved ids so future runs skip the resolution step
          await sb.from('tracks').update({
            youtube_channel_id: channelId,
            youtube_video_id: videoId,
          }).eq('id', t.id);
          resolved++;
        }
      }

      if (!channelId) { skipped++; continue; }

      // 2. Get subscriber count (cached per run)
      const subs = channelCache.has(channelId)
        ? channelCache.get(channelId)!
        : await getChannelSubscribers(channelId);
      channelCache.set(channelId, subs);

      // 3. Recompute the score and persist
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

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    resolved,
    total: tracks?.length ?? 0,
  });
}
