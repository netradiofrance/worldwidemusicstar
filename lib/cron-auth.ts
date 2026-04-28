/**
 * Authorize a request to a cron-style endpoint.
 *
 * Allowed if EITHER:
 *  - request carries the correct x-cron-secret header (used by Vercel Cron),
 *    OR
 *  - request comes from an authenticated admin session (used by the
 *    admin dashboard "Run now" buttons).
 */
import { getAdminFromCookie } from './admin-auth';

export async function authorizeCron(req: Request): Promise<boolean> {
  const expected = process.env.CRON_SECRET;
  // Allow if no secret is configured (dev convenience)
  if (!expected) return true;

  const got =
    req.headers.get('x-cron-secret') ??
    new URL(req.url).searchParams.get('key') ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  if (got === expected) return true;

  const session = await getAdminFromCookie();
  return !!session;
}
