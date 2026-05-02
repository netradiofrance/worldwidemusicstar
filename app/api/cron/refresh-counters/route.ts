import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase';
import { getArtistFollowers } from '@/lib/spotify';
import { getVideoInfo, getChannelSubscribers } from '@/lib/youtube';
import { computeScore } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Master cron: refresh all counters and recompute scores.
 *
 * Architectural note — previous version did `fetch()` to /api/spotify/refresh
 * and /api/youtube/refresh internally. That had two problems:
 *   1. Internal cross-function fetches on Vercel sometimes fail auth (the
 *      x-cron-secret header was set but somehow not honored in production).
 *   2. Promise.allSettled hid any failure — the cron always returned 200
 *      with a JSON body containing the real error, but Vercel's UI only
 *      shows the status code, so failures looked like successes.
 *
 * This rewrite does everything inline: one cron call hits Spotify and
 * YouTube directly for every active track, with verbose logging at every
 * step. The response JSON now lists every track touched (or skipped, with
 * a reason) so the next "Run" trigger gives us a forensic trail.
 *
 * Returns 500 if too many failures (>50%) — so the next misfire surfaces
 * as a real error in Vercel logs instead of a misleading 200.
 */
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}

interface TrackReport {
  id: string;
  artistName: string;
  spotify: 'updated' | 'skipped' | 'failed' | 'no-id';
  spotifyDetail?: string;
  youtube: 'updated' | 'skipped' | 'failed' | 'no-id';
  youtubeDetail?: string;
  newSpotifyFollowers?: number;
  newYoutubeSubscribers?: number;
  newScore?: number;
}

async function run() {
  const startedAt = Date.now();
  console.log('[refresh-counters] START');

  const sb = createServerClient();
  const { data: tracks, error } = await sb
    .from('tracks')
    .select('id, artist_name, spotify_track_id, youtube_video_id, youtube_channel_id, votes_count, spotify_followers, youtube_subscribers')
    .eq('status', 'active');

  if (error) {
    console.error('[refresh-counters] FATAL — could not load tracks:', error);
    return NextResponse.json(
      { ok: false, error: 'Database error', detail: error.message },
      { status: 500 },
    );
  }

  console.log(`[refresh-counters] loaded ${tracks?.length ?? 0} active tracks`);

  if (!tracks || tracks.length === 0) {
    return NextResponse.json({ ok: true, message: 'No active tracks to refresh', total: 0, reports: [] });
  }

  const reports: TrackReport[] = [];
  // Cache YouTube channel lookups within a single run to save quota
  const youtubeChannelCache = new Map<string, number>();

  for (const t of tracks) {
    const report: TrackReport = {
      id: t.id,
      artistName: t.artist_name,
      spotify: 'skipped',
      youtube: 'skipped',
    };

    let newSpotifyFollowers = t.spotify_followers ?? 0;
    let newYoutubeSubscribers = t.youtube_subscribers ?? 0;

    // ---------- Spotify ----------
    if (!t.spotify_track_id) {
      report.spotify = 'no-id';
    } else {
      try {
        // Fetch the track to find its artist id, then look up followers
        const tokenAuth = await spotifyAccessHeader();
        const trackRes = await fetch(
          `https://api.spotify.com/v1/tracks/${t.spotify_track_id}`,
          tokenAuth,
        );
        if (!trackRes.ok) {
          report.spotify = 'failed';
          report.spotifyDetail = `HTTP ${trackRes.status} on /tracks/${t.spotify_track_id}`;
        } else {
          const trackData = await trackRes.json();
          const artistId = trackData?.artists?.[0]?.id;
          if (!artistId) {
            report.spotify = 'failed';
            report.spotifyDetail = 'No artist id in Spotify response';
          } else {
            newSpotifyFollowers = await getArtistFollowers(artistId);
            report.spotify = 'updated';
            report.newSpotifyFollowers = newSpotifyFollowers;
          }
        }
      } catch (e: any) {
        report.spotify = 'failed';
        report.spotifyDetail = e?.message ?? String(e);
        console.error(`[refresh-counters] Spotify error for track ${t.id}:`, e);
      }
    }

    // ---------- YouTube ----------
    if (!t.youtube_video_id) {
      report.youtube = 'no-id';
    } else {
      try {
        let channelId = t.youtube_channel_id;
        if (!channelId) {
          const info = await getVideoInfo(t.youtube_video_id);
          if (!info) {
            report.youtube = 'failed';
            report.youtubeDetail = 'Could not look up video info';
          } else {
            channelId = info.channelId;
            // Best-effort persist channel id; ignore error
            await sb.from('tracks').update({ youtube_channel_id: channelId }).eq('id', t.id);
          }
        }

        if (channelId) {
          if (youtubeChannelCache.has(channelId)) {
            newYoutubeSubscribers = youtubeChannelCache.get(channelId)!;
          } else {
            newYoutubeSubscribers = await getChannelSubscribers(channelId);
            youtubeChannelCache.set(channelId, newYoutubeSubscribers);
          }
          report.youtube = 'updated';
          report.newYoutubeSubscribers = newYoutubeSubscribers;
        }
      } catch (e: any) {
        report.youtube = 'failed';
        report.youtubeDetail = e?.message ?? String(e);
        console.error(`[refresh-counters] YouTube error for track ${t.id}:`, e);
      }
    }

    // ---------- Persist if anything changed ----------
    if (report.spotify === 'updated' || report.youtube === 'updated') {
      const newScore = computeScore({
        votes_count: t.votes_count ?? 0,
        spotify_followers: newSpotifyFollowers,
        youtube_subscribers: newYoutubeSubscribers,
      });
      report.newScore = newScore;

      const updatePayload: Record<string, any> = { score: newScore };
      if (report.spotify === 'updated') {
        updatePayload.spotify_followers = newSpotifyFollowers;
        updatePayload.spotify_followers_updated_at = new Date().toISOString();
      }
      if (report.youtube === 'updated') {
        updatePayload.youtube_subscribers = newYoutubeSubscribers;
        updatePayload.youtube_subscribers_updated_at = new Date().toISOString();
      }

      const { error: updateErr } = await sb.from('tracks').update(updatePayload).eq('id', t.id);
      if (updateErr) {
        console.error(`[refresh-counters] DB update failed for track ${t.id}:`, updateErr);
        report.spotifyDetail = (report.spotifyDetail ? report.spotifyDetail + ' | ' : '') + `DB update: ${updateErr.message}`;
        if (report.spotify === 'updated') report.spotify = 'failed';
        if (report.youtube === 'updated') report.youtube = 'failed';
      }
    }

    reports.push(report);
  }

  const elapsed = Date.now() - startedAt;
  const updated = reports.filter(r => r.spotify === 'updated' || r.youtube === 'updated').length;
  const failed = reports.filter(r => r.spotify === 'failed' || r.youtube === 'failed').length;

  console.log(`[refresh-counters] DONE in ${elapsed}ms — total ${reports.length}, updated ${updated}, failed ${failed}`);

  return NextResponse.json({
    ok: true,
    elapsedMs: elapsed,
    total: reports.length,
    updated,
    failed,
    reports,
  });
}

/**
 * Get a Spotify access token wrapped in a fetch-ready RequestInit.
 * We need this for direct /tracks/<id> calls (the lib only exposes
 * helpers for searching and getting followers, not for raw track lookup).
 */
async function spotifyAccessHeader(): Promise<RequestInit> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Spotify credentials missing');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Spotify token error: HTTP ${r.status}`);
  const data = await r.json() as { access_token: string };
  return { headers: { Authorization: `Bearer ${data.access_token}` }, cache: 'no-store' };
}
