import { NextResponse } from 'next/server';
import { getAdminFromCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Admin-triggered action runner. The admin dashboard has "Run now" buttons
 * for cron-style operations. Rather than have the dashboard call the cron
 * endpoints directly (which would require the CRON_SECRET to be exposed
 * client-side, or rely on the cookie auth fall-through), this single
 * endpoint is the bridge: it checks the admin session, then calls the
 * relevant cron endpoint with the CRON_SECRET on the server side.
 *
 * Body: { action: 'refresh-counters' | 'monthly-archive' | 'generate-article' }
 */
export async function POST(req: Request) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });

  let body: { action?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const action = body.action;
  const map: Record<string, string> = {
    'refresh-counters':   '/api/cron/refresh-counters',
    'monthly-archive':    '/api/cron/monthly-archive',
    'generate-article':   '/api/blog/generate',
  };
  const path = action ? map[action] : null;
  if (!path) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const base = new URL(req.url).origin;
  const secret = process.env.CRON_SECRET ?? '';
  try {
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': secret },
      body: '{}',
      cache: 'no-store',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: r.ok, status: r.status, data });
  } catch (e: any) {
    console.error('[admin/actions] error:', e);
    return NextResponse.json({ error: e?.message ?? 'Action failed' }, { status: 500 });
  }
}
