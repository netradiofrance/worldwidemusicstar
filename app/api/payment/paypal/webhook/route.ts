import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyWebhook, captureOrder } from '@/lib/paypal';
import { sendEmail, chartConfirmationEmail, paymentReceiptEmail } from '@/lib/email';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handles PayPal webhooks.
 *
 * We listen for two events:
 *   - CHECKOUT.ORDER.APPROVED    -> capture the order (server-side capture is more reliable)
 *   - PAYMENT.CAPTURE.COMPLETED  -> mark payment completed, activate the track, send emails
 *
 * Configure the webhook in PayPal dashboard:
 *   https://your-domain/api/payment/paypal/webhook
 *   subscribe to: Checkout order approved, Payment capture completed,
 *                 Payment capture refunded, Payment capture denied
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const verified = await verifyWebhook(req.headers, raw).catch(() => false);
  if (!verified) {
    console.warn('[paypal/webhook] signature verification failed');
    return new NextResponse('invalid signature', { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new NextResponse('bad payload', { status: 400 }); }

  const sb = createServerClient();
  const type = event.event_type as string;

  try {
    if (type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event.resource?.id;
      if (orderId) {
        try { await captureOrder(orderId); } catch (e) { console.error('[paypal/webhook] capture failed:', e); }
      }
      return NextResponse.json({ ok: true });
    }

    if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      // For captures inside an order, the parent order id lives in supplementary_data.related_ids.order_id
      const orderId = capture?.supplementary_data?.related_ids?.order_id ?? capture?.id;
      const captureId = capture?.id;
      const customId = capture?.custom_id ?? capture?.purchase_units?.[0]?.custom_id;

      // Find the payment row by order id (preferred) or by custom_id (track id)
      let trackId: string | null = customId ?? null;
      if (!trackId && orderId) {
        const { data } = await sb
          .from('payments')
          .select('track_id')
          .eq('provider_order_id', orderId)
          .maybeSingle();
        trackId = data?.track_id ?? null;
      }
      if (!trackId) {
        console.error('[paypal/webhook] could not resolve track id for capture', capture?.id);
        return NextResponse.json({ ok: true });
      }

      // Mark payment completed
      await sb.from('payments').update({
        status: 'completed',
        provider_capture_id: captureId,
        completed_at: new Date().toISOString(),
        raw_payload: event,
      }).eq('provider_order_id', orderId);

      // Activate track
      const { data: track } = await sb
        .from('tracks')
        .update({ status: 'active', paid_at: new Date().toISOString() })
        .eq('id', trackId)
        .select('*')
        .single();

      // Send emails
      if (track) {
        const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com';
        const trackUrl = `${site}/track/${track.id}`;
        const genreName = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;

        try {
          const conf = chartConfirmationEmail({
            artistName: track.artist_name,
            songTitle: track.song_title,
            genreName,
            trackUrl,
          });
          await sendEmail({ to: track.email, ...conf });
        } catch (e) { console.error('[paypal/webhook] confirmation email failed:', e); }

        try {
          const receipt = paymentReceiptEmail({
            artistName: track.artist_name,
            songTitle: track.song_title,
            amount: Number(capture?.amount?.value ?? 0),
            orderId: orderId ?? captureId ?? '',
          });
          await sendEmail({ to: track.email, ...receipt });
        } catch (e) { console.error('[paypal/webhook] receipt email failed:', e); }
      }

      return NextResponse.json({ ok: true });
    }

    if (type === 'PAYMENT.CAPTURE.DENIED' || type === 'PAYMENT.CAPTURE.REFUNDED') {
      const capture = event.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id ?? capture?.id;
      await sb.from('payments').update({
        status: type === 'PAYMENT.CAPTURE.REFUNDED' ? 'refunded' : 'failed',
        raw_payload: event,
      }).eq('provider_order_id', orderId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: type });
  } catch (e) {
    console.error('[paypal/webhook] handler error:', e);
    return new NextResponse('error', { status: 500 });
  }
}
