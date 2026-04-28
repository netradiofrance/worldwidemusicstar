import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const ALG = 'HS256';
const COOKIE = 'wwms_admin';
const TTL_SECONDS = 60 * 60 * 12; // 12h

function getKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET missing');
  return new TextEncoder().encode(secret);
}

export interface AdminSession { sub: string; email: string; role: string }

export async function createAdminToken(s: AdminSession): Promise<string> {
  return await new SignJWT({ email: s.email, role: s.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getKey());
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ''),
      role: String(payload.role ?? 'admin'),
    };
  } catch {
    return null;
  }
}

export async function setAdminCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getAdminFromCookie(): Promise<AdminSession | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE;
