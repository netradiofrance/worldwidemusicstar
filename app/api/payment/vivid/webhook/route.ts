import { NextResponse } from 'next/server';
import { verifyVividSignature, VividWebhookPayload } from '@/lib/vivid';
import { activateTrack } from '@/lib/track-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vivid Money webhook receiver.
 *
 * Vivid POSTs a JSON body with HMAC-SHA256 signature in the X-Signature
 * header. The signature is computed over the RAW body (not a re-encoded
 * version) so we read the raw text first, then JSON.parse it ourselves.
 *
 * On STATUS_SUCCESS we delegate to activateTrack(), which is shared with
 * the admin "Mark as paid" path so the two flows produce identical state.
 *
 * Logging is intentionally verbose — when a payment goes through but a
 * track is not activated, the logs are our only forensic tool, since
 * Vivid's dashboard does not expose webhook delivery history (we checked).
 *
 * The endpoint always responds 200 once the signature is valid, even if
 * the payload concerns an unknown order or an irrelevant status — this
 * prevents Vivid from retrying indefinitely for cases we don't care about.
 */
export async function POST(req: Request) {
  // 1. Read the raw body before any parsing so we can verify the signature
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  console.log('[vivid/webhook] inbound request', {
    bodyLength: rawBody.length,
    hasSignature: !!signature,
    signaturePrefix: signature.slice(0, 12),
    contentType: req.headers.get('content-type'),
    userAgent: req.headers.get('user-agent'),
  });

  if (!signature) {
    console.warn('[vivid/webhook] REJECTED — missing X-Signature header');
    return NextResponse.json({ error: 'Signature is undefined' }, { status: 401 });
  }
  if (!verifyVividSignature(rawBody, signature)) {
    console.warn('[vivid/webhook] REJECTED — invalid signature', {
      receivedSignaturePrefix: signature.slice(0, 12),
      bodyPreview: rawBody.slice(0, 200),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse the JSON now that the signature checks out
  let payload: VividWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('[vivid/webhook] JSON parse failed', e);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[vivid/webhook] payload parsed', {
    status: payload.status,
    externalOrderId: payload.externalOrderId,
    paymentId: payload.paymentId,
  });

  // 3. Only act on a successful payment with a track reference
  if (payload.status !== 'STATUS_SUCCESS' || !payload.externalOrderId) {
    console.log('[vivid/webhook] IGNORED — non-success status or missing externalOrderId');
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 4. Activate the track via the shared helper
  const result = await activateTrack({
    trackId: payload.externalOrderId,
    paymentProviderId: payload.paymentId,
    rawProviderPayload: payload,
    source: 'webhook',
  });

  if (!result.ok) {
    console.error('[vivid/webhook] activation FAILED:', result.error, 'for trackId:', payload.externalOrderId);
    // Acknowledge anyway so Vivid does not retry forever — the admin
    // can intervene manually via the "Mark as paid" button.
    return NextResponse.json({ ok: true, activationError: result.error });
  }

  console.log('[vivid/webhook] activation SUCCESS', {
    trackId: payload.externalOrderId,
    alreadyActive: result.alreadyActive,
  });

  return NextResponse.json({ ok: true, alreadyActive: result.alreadyActive });
}
