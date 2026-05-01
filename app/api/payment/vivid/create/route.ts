import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { createVividPaymentLink } from '@/lib/vivid';
import { isValidGenreSlug } from '@/lib/genres';
import { extractYouTubeVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    body = Body.parse(await req.json());
  } catch (e: any) {
    console.error('[vivid/create] form validation error:', e?.errors ?? e);
    const detail = Array.isArray(e?.errors) && e.errors[0]
      ? `${e.errors[0].path?.join('.') ?? 'field'}: ${e.errors[0].message}`
      : 'Invalid form data';
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  if (!isValidGenreSlug(body.genre)) {
    return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
  }

  // Optional YouTube
  let youtubeVideoId: string | null = null;
  if (body.youtubeUrl) {
    youtubeVideoId = extractYouTubeVideoId(body.youtubeUrl);
    if (!youtubeVideoId && !body.youtubeUrl.includes('/@') && !body.youtubeUrl.includes('/channel/')) {
      // Only block if it's neither a valid video URL nor a channel/handle URL
      return NextResponse.json(
        { error: 'YouTube URL not valid. Leave blank if you have no clip yet.' },
        { status: 400 },
      );
    }
  }

  const sb = createServerClient();
  const price = Number(process.env.NEXT_PUBLIC_ENTRY_PRICE_EUR ?? '99.99');

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
    console.error('[vivid/create] track insert error:', trackErr);
    return NextResponse.json(
      { error: 'Could not create your entry. Please try again.' },
      { status: 500 },
    );
  }

  // 2) Create the Vivid payment link
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '');
  const redirectUrl = `${site}/add-a-song/success?track=${track.id}`;
  const webhookUrl  = `${site}/api/payment/vivid/webhook`;

  let payment;
  try {
    payment = await createVividPaymentLink({
      amount: price,
      currencyCode: 'EUR',
      externalOrderId: track.id,
      description: `WorldWide Music Star — Chart entry: "${body.songTitle}" by ${body.artistName}`,
      redirectUrl,
      webhookUrl,
      language: 'en',
    });
  } catch (err: any) {
    console.error('[vivid/create] Vivid error:', err?.message ?? err);
    // Clean up the pending track to avoid orphan rows
    await sb.from('tracks').delete().eq('id', track.id);
    return NextResponse.json(
      { error: `Payment provider error: ${err?.message ?? 'unknown'}` },
      { status: 502 },
    );
  }

  // 3) Record a pending payment row
  await sb.from('payments').insert({
    track_id: track.id,
    provider: 'vivid' as any, // requires DB enum extension — see migration 007
    amount_usd: price, // we keep the column name but it now holds EUR; renaming would break too much
    status: 'pending',
  });

  return NextResponse.json({ approveUrl: payment.url });
}
