import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { createOrder } from '@/lib/paypal';
import { isValidGenreSlug } from '@/lib/genres';
import { extractYouTubeVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Accept null/empty for optional URLs without failing Zod
const optionalUrl = z
  .union([z.string().url(), z.literal(''), z.null()])
  .optional()
  .transform(v => (v === '' ? null : v ?? null));

const Body = z.object({
  email: z.string().email(),
  genre: z.string(),
  artistName: z.string().min(1).max(200),
  songTitle: z.string().min(1).max(200),
  spotifyTrackId: z.string().nullable().optional(),
  spotifyUrl: optionalUrl,
  spotifyArtistId: z.string().nullable().optional(),
  coverUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    const json = await req.json();
    body = Body.parse(json);
  } catch (e: any) {
    // Surface a more useful error to the client + log details server-side
    console.error('[paypal/create] form validation error:', e?.errors ?? e);
    const detail = Array.isArray(e?.errors) && e.errors[0]
      ? `${e.errors[0].path?.join('.') ?? 'field'}: ${e.errors[0].message}`
      : 'Invalid form data';
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  if (!isValidGenreSlug(body.genre)) {
    return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
  }

  // YouTube URL is optional. Extract video id only if provided.
  let youtubeVideoId: string | null = null;
  if (body.youtubeUrl) {
    youtubeVideoId = extractYouTubeVideoId(body.youtubeUrl);
    if (!youtubeVideoId) {
      return NextResponse.json(
        { error: 'The YouTube URL you entered is not valid. Leave the field empty if you have no clip yet.' },
        { status: 400 },
      );
    }
  }

  const sb = createServerClient();
  const price = Number(process.env.NEXT_PUBLIC_ENTRY_PRICE_USD ?? '99.99');

  // 1) Create the track row in pending_payment status
  const { data: track, error: trackErr } = await sb
    .from('tracks')
    .insert({
      artist_name: body.artistName,
      song_title: body.songTitle,
      genre: body.genre as any,
      email: body.email,
      spotify_track_id: body.spotifyTrackId ?? null,
      spotify_url: body.spotifyUrl ?? null,
      cover_url: body.coverUrl ?? null,
      youtube_url: body.youtubeUrl ?? null,
      youtube_video_id: youtubeVideoId,
      status: 'pending_payment',
    })
    .select('id')
    .single();

  if (trackErr || !track) {
    console.error('[paypal/create] track insert error:', trackErr);
    return NextResponse.json(
      { error: 'Could not create your entry. Please try again or contact support.' },
      { status: 500 },
    );
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
  } catch (err: any) {
    console.error('[paypal/create] PayPal order error:', err?.message ?? err);
    // Clean up the track row so we don't leak orphans
    await sb.from('tracks').delete().eq('id', track.id);
    return NextResponse.json(
      { error: `Payment provider error: ${err?.message ?? 'unknown'}` },
      { status: 502 },
    );
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
