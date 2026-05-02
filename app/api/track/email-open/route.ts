import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPixelToken, hashIp } from '@/lib/email-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/track/email-open?t=<jwt>
 *
 * Returns a 1x1 transparent GIF. As a side effect, records an "open"
 * event in email_events tied to the trackId encoded in the JWT.
 *
 * Caveats — this measurement is well known to be imperfect:
 *   - Gmail proxies images in its datacenters, so an "open" may register
 *     when the email arrives, not when it is actually read.
 *   - Apple Mail Privacy Protection (since iOS 15) does the same.
 *   - Outlook desktop does not auto-load images, so genuine opens may
 *     not register at all.
 * The directional signal (open rate over time, comparison across
 * deliverability fixes) is still useful even with these caveats.
 *
 * The response is always a GIF, regardless of token validity, so an
 * attacker probing the endpoint cannot tell from the response whether
 * their token was rejected.
 */

// 43-byte GIF89a, 1x1 fully transparent
const TRANSPARENT_GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Content-Length': String(TRANSPARENT_GIF.length),
  // Do NOT cache — we want to capture every open
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, private',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function pixelResponse() {
  return new Response(new Uint8Array(TRANSPARENT_GIF), { status: 200, headers: PIXEL_HEADERS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');

  // Always return the pixel — even on bad token — so we never reveal
  // anything about the validity of the request to a probe.
  if (!token) return pixelResponse();

  const payload = await verifyPixelToken(token);
  if (!payload) return pixelResponse();

  // Capture metadata. Vercel sets x-forwarded-for; fall back to remote-addr.
  const userAgent = req.headers.get('user-agent') ?? null;
  const fwd = req.headers.get('x-forwarded-for');
  const ip = (fwd?.split(',')[0]?.trim()) ?? '0.0.0.0';
  const ipHash = hashIp(ip);

  // Best-effort insert — never let a DB hiccup turn the pixel into a 500
  try {
    const sb = createServerClient();
    await sb.from('email_events').insert({
      track_id: payload.trackId,
      email_type: payload.emailType,
      attempt: payload.attempt ?? null,
      event_type: 'open',
      user_agent: userAgent,
      ip_hash: ipHash,
    });
  } catch (e) {
    console.error('[track/email-open] insert failed (non-fatal):', e);
  }

  return pixelResponse();
}
