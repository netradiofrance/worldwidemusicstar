import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { getAdminFromCookie } from '@/lib/admin-auth';
import { computeScore } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Patch = z.object({
  artist_name: z.string().optional(),
  song_title: z.string().optional(),
  genre: z.string().optional(),
  email: z.string().email().optional(),
  spotify_url: z.string().nullable().optional(),
  spotify_track_id: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
  spotify_followers: z.number().min(0).optional(),
  youtube_subscribers: z.number().min(0).optional(),
  votes_count: z.number().min(0).optional(),
  status: z.enum(['pending_payment','active','rejected','archived']).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await params;

  let body;
  try { body = Patch.parse(await req.json()); }
  catch (e: any) { return NextResponse.json({ error: 'Invalid', details: e.errors }, { status: 400 }); }

  const sb = createServerClient();
  // Recompute score if any counter changed
  if (body.votes_count !== undefined || body.spotify_followers !== undefined || body.youtube_subscribers !== undefined) {
    const { data: cur } = await sb.from('tracks').select('votes_count, spotify_followers, youtube_subscribers').eq('id', id).maybeSingle();
    if (cur) {
      const newCounters = {
        votes_count: body.votes_count ?? cur.votes_count,
        spotify_followers: body.spotify_followers ?? cur.spotify_followers,
        youtube_subscribers: body.youtube_subscribers ?? cur.youtube_subscribers,
      };
      (body as any).score = computeScore(newCounters);
    }
  }

  const { error } = await sb.from('tracks').update(body as any).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await params;
  const sb = createServerClient();
  const { error } = await sb.from('tracks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
