import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { getAdminFromCookie } from '@/lib/admin-auth';
import { computeScore } from '@/lib/scoring';
import { isValidGenreSlug } from '@/lib/genres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  artist_name: z.string().min(1),
  song_title: z.string().min(1),
  genre: z.string(),
  email: z.string().email(),
  spotify_url: z.string().nullable().optional(),
  spotify_track_id: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
  spotify_followers: z.number().min(0).default(0),
  youtube_subscribers: z.number().min(0).default(0),
  votes_count: z.number().min(0).default(0),
  status: z.enum(['pending_payment','active','rejected','archived']).default('active'),
});

export async function POST(req: Request) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });

  let body;
  try { body = Body.parse(await req.json()); }
  catch (e: any) { return NextResponse.json({ error: 'Invalid form', details: e.errors }, { status: 400 }); }
  if (!isValidGenreSlug(body.genre)) return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });

  const score = computeScore({
    votes_count: body.votes_count,
    spotify_followers: body.spotify_followers,
    youtube_subscribers: body.youtube_subscribers,
  });

  const sb = createServerClient();
  const { data, error } = await sb.from('tracks').insert({
    ...body,
    genre: body.genre as any,
    is_admin_added: true,
    score,
    paid_at: body.status === 'active' ? new Date().toISOString() : null,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
