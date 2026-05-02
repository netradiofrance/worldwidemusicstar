import { createServerClient } from '@/lib/supabase';
import { sendEmail, chartConfirmationEmail, paymentReceiptEmail } from '@/lib/email';
import { GENRE_BY_SLUG } from '@/lib/genres';

/**
 * Activate a pending track and send the standard confirmation + receipt
 * emails. Idempotent — safe to call twice. Returns the path the artist
 * can visit to see their chart placement.
 *
 * Used by:
 *   1. The Vivid webhook (automatic activation)
 *   2. The admin "Mark as paid" action (manual fallback if the webhook
 *      didn't fire — e.g. delivery failure, server hiccup)
 *
 * Why a shared helper: keeping these two paths bit-for-bit identical
 * means an admin manually marking a track produces exactly the same
 * downstream artifacts as the webhook would have — same emails, same
 * activated_at timestamp shape, same payment row update.
 */
export async function activateTrack(opts: {
  trackId: string;
  paymentProviderId?: string;   // Vivid paymentId or 'admin-manual'
  rawProviderPayload?: unknown; // Stored as audit trail
  source: 'webhook' | 'admin-manual';
}): Promise<{ ok: true; alreadyActive: boolean } | { ok: false; error: string }> {
  const sb = createServerClient();

  const { data: track, error } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, email, status')
    .eq('id', opts.trackId)
    .maybeSingle();

  if (error || !track) {
    return { ok: false, error: 'Track not found' };
  }

  // Idempotent: if already active, return success without re-sending emails
  if (track.status === 'active') {
    return { ok: true, alreadyActive: true };
  }

  if (track.status !== 'pending_payment') {
    return { ok: false, error: `Cannot activate a track in status "${track.status}"` };
  }

  // 1. Activate the track
  const { error: updateErr } = await sb
    .from('tracks')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('id', track.id);

  if (updateErr) {
    return { ok: false, error: `Activation failed: ${updateErr.message}` };
  }

  // 2. Update the matching payment row to completed
  await sb
    .from('payments')
    .update({
      status: 'completed',
      provider_capture_id: opts.paymentProviderId ?? null,
      raw_payload: (opts.rawProviderPayload as any) ?? { source: opts.source },
    })
    .eq('track_id', track.id)
    .eq('status', 'pending');

  // 3. Send confirmation + receipt emails (best effort)
  try {
    const genreName = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
    const trackUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '')}/track/${track.id}`;

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
      orderId: opts.paymentProviderId ?? track.id,
    });
    await sendEmail({ to: track.email, ...receipt });
  } catch (e) {
    // Email failure is non-fatal — the track is activated, the admin
    // can resend confirmation manually if needed.
    console.error('[activateTrack] email send failed (non-fatal):', e);
  }

  return { ok: true, alreadyActive: false };
}
