import { NextResponse } from 'next/server';
import { getAdminFromCookie } from '@/lib/admin-auth';
import { activateTrack } from '@/lib/track-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin "Mark as paid" — fallback for cases where the Vivid webhook did
 * not arrive (delivery failure, signature mismatch, etc.) but the admin
 * has confirmed the payment via Vivid's dashboard.
 *
 * Activates the track and sends the confirmation + receipt emails, just
 * like the webhook would have. Idempotent — calling twice is safe.
 */
export async function POST(req: Request) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });

  let body: { trackId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const trackId = body.trackId?.trim();
  if (!trackId) return NextResponse.json({ error: 'trackId required' }, { status: 400 });

  const result = await activateTrack({
    trackId,
    paymentProviderId: 'admin-manual',
    rawProviderPayload: { source: 'admin-manual', activatedBy: 'admin' },
    source: 'admin-manual',
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    alreadyActive: result.alreadyActive,
    message: result.alreadyActive
      ? 'Track was already active.'
      : 'Track activated. Confirmation + receipt emails sent.',
  });
}
