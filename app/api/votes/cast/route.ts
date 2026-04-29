import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { computeScore } from '@/lib/scoring';
import { getClientIp, getUserAgent, getVoterHash } from '@/lib/voting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  trackId: z.string().uuid(),
  adSessionId: z.string().min(8),
});

// Rate limit window — change this single value to relax/tighten.
// 1 hour gives serious fans the ability to keep boosting their artist
// without letting bots flood the chart.
const VOTE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  let payload: z.infer<typeof Body>;
  try {
    const json = await req.json();
    payload = Body.parse(json);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { trackId, adSessionId } = payload;

  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const voterHash = getVoterHash(ip, ua);

  const sb = createServerClient();

  // 1. Rate limit check — has this voter voted for this track in the
  //    last hour?
  const since = new Date(Date.now() - VOTE_WINDOW_MS).toISOString();
  const { data: recent, error: recentErr } = await sb
    .from('votes')
    .select('created_at')
    .eq('track_id', trackId)
    .eq('voter_hash', voterHash)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentErr) {
    console.error('[votes/cast] rate-limit query error:', recentErr);
    return NextResponse.json({ error: 'Could not register vote' }, { status: 500 });
  }
  if (recent && recent.length > 0) {
    const lastAt = new Date(recent[0].created_at).getTime();
    const waitMs = Math.max(0, VOTE_WINDOW_MS - (Date.now() - lastAt));
    const waitMin = Math.ceil(waitMs / 60_000);
    return NextResponse.json(
      {
        error: `You can vote again for this track in ${waitMin} minute${waitMin > 1 ? 's' : ''}.`,
        retryAfterMinutes: waitMin,
      },
      { status: 429 },
    );
  }

  // 2. Insert the vote
  const { error: insertErr } = await sb.from('votes').insert({
    track_id: trackId,
    voter_hash: voterHash,
    ip_inet: ip,
    user_agent: ua,
    ad_session_id: adSessionId,
    ad_completed: true,
  });

  if (insertErr) {
    console.error('[votes/cast] insert error:', insertErr);
    return NextResponse.json({ error: 'Could not register vote' }, { status: 500 });
  }

  // 3. Bump the cached counter & score on the track
  const { data: t, error: readErr } = await sb
    .from('tracks')
    .select('votes_count, spotify_followers, youtube_subscribers')
    .eq('id', trackId)
    .maybeSingle();

  if (readErr || !t) {
    console.error('[votes/cast] read track error:', readErr);
    return NextResponse.json({ ok: true });
  }

  const newVotes = (t.votes_count ?? 0) + 1;
  const newScore = computeScore({
    votes_count: newVotes,
    spotify_followers: t.spotify_followers ?? 0,
    youtube_subscribers: t.youtube_subscribers ?? 0,
  });
  await sb
    .from('tracks')
    .update({ votes_count: newVotes, score: newScore })
    .eq('id', trackId);

  return NextResponse.json({ ok: true, votes_count: newVotes, score: newScore });
}
