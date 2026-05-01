import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyVividSignature, VividWebhookPayload } from '@/lib/vivid';
import { sendEmail, chartConfirmationEmail, paymentReceiptEmail } from '@/lib/email';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vivid Money webhook receiver.
 *
 * Vivid POSTs a JSON body with HMAC-SHA256 signature in the X-Signature
 * header. The signature is computed over the RAW body (not a re-encoded
 * version) so we read the raw text first, then JSON.parse it ourselves.
 *
 * On STATUS_SUCCESS we:
 *   1. Activate the track (pending_payment -> active)
 *   2. Mark the payment row as completed
 *   3. Send the confirmation + receipt emails via Mailjet
 *
 * The endpoint always responds 200 once the signature is valid, even if
 * the payload concerns an unknown order or an irrelevant status — this
 * prevents Vivid from retrying indefinitely for cases we don't care about.
 */
export async function POST(req: Request) {
  // 1. Read the raw body before any parsing so we can verify the signature
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  if (!signature) {
    console.warn('[vivid/webhook] missing X-Signature');
    return NextResponse.json({ error: 'Signature is undefined' }, { status: 401 });
  }
  if (!verifyVividSignature(rawBody, signature)) {
    console.warn('[vivid/webhook] invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse the JSON now that the signature checks out
  let payload: VividWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[vivid/webhook] received', { status: payload.status, externalOrderId: payload.externalOrderId });

  // 3. Only act on a successful payment with a track reference
  if (payload.status !== 'STATUS_SUCCESS' || !payload.externalOrderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const trackId = payload.externalOrderId;
  const sb = createServerClient();

  // 4. Look up the track
  const { data: track, error: trackErr } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, email, status')
    .eq('id', trackId)
    .maybeSingle();

  if (trackErr || !track) {
    console.error('[vivid/webhook] track not found:', trackId, trackErr);
    // Acknowledge anyway so Vivid does not retry
    return NextResponse.json({ ok: true, ignored: true, reason: 'track-not-found' });
  }

  // Idempotency — if already active, do not duplicate emails
  if (track.status === 'active') {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  // 5. Activate the track
  const { error: updateErr } = await sb
    .from('tracks')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('id', trackId);

  if (updateErr) {
    console.error('[vivid/webhook] track activation failed:', updateErr);
    return NextResponse.json({ error: 'activation failed' }, { status: 500 });
  }

  // 6. Update the matching payment row to completed
  await sb
    .from('payments')
    .update({
      status: 'completed',
      provider_capture_id: payload.paymentId ?? null,
      raw_payload: payload as any,
    })
    .eq('track_id', trackId)
    .eq('status', 'pending');

  // 7. Send confirmation emails (best effort — do not fail the webhook if email is down)
  try {
    const genreName = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
    const trackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com'}/track/${track.id}`;
    const confirmation = chartConfirmationEmail({
      artistName: track.artist_name,
      songTitle: track.song_title,
      genreName,
      trackUrl,
    });
    await sendEmail({ to: track.email, ...confirmation });

    const price = Number(process.env.NEXT_PUBLIC_ENTRY_PRICE_EUR ?? '99.99');
    const receipt = paymentReceiptEmail({
      artistName: track.artist_name,
      songTitle: track.song_title,
      amount: price,
      orderId: payload.paymentId ?? track.id,
    });
    await sendEmail({ to: track.email, ...receipt });
  } catch (e) {
    console.error('[vivid/webhook] email send failed (non-fatal):', e);
  }

  return NextResponse.json({ ok: true });
}
