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

  // Insert vote — unique constraint will catch repeats
  const { error: insertErr } = await sb.from('votes').insert({
    track_id: trackId,
    voter_hash: voterHash,
    ip_inet: ip,
    user_agent: ua,
    ad_session_id: adSessionId,
    ad_completed: true,
  });

  if (insertErr) {
    // 23505 = unique_violation in Postgres
    if ((insertErr as any).code === '23505') {
      return NextResponse.json(
        { error: 'You have already voted for this track today.' },
        { status: 409 },
      );
    }
    console.error('[votes/cast] insert error:', insertErr);
    return NextResponse.json({ error: 'Could not register vote' }, { status: 500 });
  }

  // Bump the cached counter & score on the track. We re-read to get
  // a consistent view rather than relying on an atomic increment.
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
