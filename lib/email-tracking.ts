import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

/**
 * Token signing for the email-open tracking pixel.
 *
 * The pixel URL embeds a short JWT carrying just the track id, the email
 * type, and the attempt number. We sign with ADMIN_JWT_SECRET (already
 * provisioned for admin sessions) so we don't have to add a new env var.
 *
 * The token has no expiry — an artist might open a reminder email weeks
 * after we sent it, and we still want to count that as a valid open.
 */

interface PixelPayload {
  trackId: string;
  emailType: string;     // 'payment_reminder' for now
  attempt?: number;
}

function getKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET missing');
  return new TextEncoder().encode(secret);
}

export async function signPixelToken(payload: PixelPayload): Promise<string> {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(getKey());
}

export async function verifyPixelToken(token: string): Promise<PixelPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (
      typeof payload.trackId === 'string' &&
      typeof payload.emailType === 'string'
    ) {
      return {
        trackId: payload.trackId,
        emailType: payload.emailType,
        attempt: typeof payload.attempt === 'number' ? payload.attempt : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Hash an IP address with a per-deployment salt so we can detect
 * duplicate opens without storing the raw IP. Privacy-friendlier and
 * GDPR-friendlier.
 */
export function hashIp(ip: string): string {
  const salt = process.env.ADMIN_JWT_SECRET ?? 'fallback-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16);
}
