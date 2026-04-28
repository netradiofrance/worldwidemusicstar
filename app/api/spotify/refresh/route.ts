import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase';
import { getArtistFollowers } from '@/lib/spotify';
import { computeScore } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Re-fetches Spotify artist follower counts for every ACTIVE track that
 * has a spotify_track_id. We keep a small in-memory cache to avoid
 * looking up the same artist twice in the same run.
 *
 * The artist id is not stored on the track row — we only have the track
 * id. To get followers we'd need the artist id. We persist the artist id
 * at submission time via the cover URL / spotify URL parsing; for tracks
 * already in the DB without it, we fetch the track first then the artist.
 */
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
    .select('id, spotify_url, spotify_track_id, votes_count, youtube_subscribers, spotify_followers')
    .eq('status', 'active');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0, skipped = 0;
  for (const t of tracks ?? []) {
    if (!t.spotify_track_id) { skipped++; continue; }
    try {
      // Fetch the track to get its artist id, then get the followers.
      const tokenRes = await fetch(
        `https://api.spotify.com/v1/tracks/${t.spotify_track_id}`,
        await spotifyAuthHeader(),
      );
      if (!tokenRes.ok) { skipped++; continue; }
      const trackData = await tokenRes.json();
      const artistId = trackData?.artists?.[0]?.id;
      if (!artistId) { skipped++; continue; }
      const followers = await getArtistFollowers(artistId);
      const score = computeScore({
        votes_count: t.votes_count ?? 0,
        spotify_followers: followers,
        youtube_subscribers: t.youtube_subscribers ?? 0,
      });
      await sb.from('tracks').update({
        spotify_followers: followers,
        spotify_followers_updated_at: new Date().toISOString(),
        score,
      }).eq('id', t.id);
      updated++;
    } catch (e) {
      console.error('[spotify/refresh] track failed', t.id, e);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, updated, skipped, total: tracks?.length ?? 0 });
}

async function spotifyAuthHeader(): Promise<RequestInit> {
  // We rely on lib/spotify's internal token cache via getArtistFollowers — but
  // for direct /tracks calls we need a token here too. Reuse the same flow.
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const data = await r.json();
  return { headers: { Authorization: `Bearer ${data.access_token}` }, cache: 'no-store' };
}
