import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { createOrder } from '@/lib/paypal';
import { isValidGenreSlug } from '@/lib/genres';
import { extractYouTubeVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  genre: z.string(),
  artistName: z.string().min(1).max(200),
  songTitle: z.string().min(1).max(200),
  spotifyTrackId: z.string().nullable().optional(),
  spotifyUrl: z.string().url().nullable().optional(),
  spotifyArtistId: z.string().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  youtubeUrl: z.string().url(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  if (!isValidGenreSlug(body.genre)) {
    return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
  }

  const youtubeVideoId = extractYouTubeVideoId(body.youtubeUrl);
  if (!youtubeVideoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const sb = createServerClient();
  const price = Number(process.env.NEXT_PUBLIC_ENTRY_PRICE_USD ?? '99.99');

  // 1) Create the track row in pending_payment status
  const { data: track, error: trackErr } = await sb
    .from('tracks')
    .insert({
      artist_name: body.artistName || 'Unknown Artist',
      song_title: body.songTitle || 'Untitled',
      genre: body.genre as any,
      email: body.email,
      spotify_track_id: body.spotifyTrackId ?? null,
      spotify_url: body.spotifyUrl ?? null,
      cover_url: body.coverUrl ?? null,
      youtube_url: body.youtubeUrl,
      youtube_video_id: youtubeVideoId,
      status: 'pending_payment',
    })
    .select('id')
    .single();

  if (trackErr || !track) {
    console.error('[paypal/create] track insert error:', trackErr);
    return NextResponse.json({ error: 'Could not create entry' }, { status: 500 });
  }

  // 2) Create the PayPal order
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com';
  const returnUrl = `${site}/add-a-song/success?track=${track.id}`;
  const cancelUrl = `${site}/add-a-song?cancelled=1`;

  let order;
  try {
    order = await createOrder({
      amount: price,
      description: `WorldWide Music Star — Chart entry: "${body.songTitle}" by ${body.artistName}`,
      customId: track.id,
      returnUrl,
      cancelUrl,
    });
  } catch (err) {
    console.error('[paypal/create] PayPal order error:', err);
    // Clean up the track row so we don't leak orphans
    await sb.from('tracks').delete().eq('id', track.id);
    return NextResponse.json({ error: 'Payment provider error' }, { status: 502 });
  }

  // 3) Record a pending payment row
  await sb.from('payments').insert({
    track_id: track.id,
    provider: 'paypal',
    provider_order_id: order.id,
    amount_usd: price,
    status: 'pending',
  });

  return NextResponse.json({ approveUrl: order.approveUrl, orderId: order.id });
}
