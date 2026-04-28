import { createHash } from 'crypto';

/**
 * Anti-fraud strategy:
 *   - Voter is identified by sha256(ip || user-agent || YYYY-MM-DD).
 *   - Unique constraint on (track_id, voter_hash) -> 1 vote per day per
 *     IP+UA per track.
 *   - User must watch the VAST ad to completion (IMA SDK fires
 *     'complete') before the vote is committed server-side.
 *   - The ad_session_id ties the front-end ad event to a row in `votes`.
 *
 * This is intentionally lightweight; it is not bulletproof against
 * determined fraud (proxies, headless browsers). Real anti-fraud
 * (rate-limiting per /24, Cloudflare Turnstile, etc.) can be layered
 * on top later. For an MVP it is enough to deter casual gaming.
 */

export function getVoterHash(ip: string, userAgent: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  return createHash('sha256').update(`${ip}|${userAgent}|${day}`).digest('hex');
}

export function getClientIp(req: Request): string {
  // Vercel forwards client IP in x-forwarded-for, first entry.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return '0.0.0.0';
}

export function getUserAgent(req: Request): string {
  return (req.headers.get('user-agent') ?? '').slice(0, 500);
}

export function newAdSessionId(): string {
  return crypto.randomUUID();
}
