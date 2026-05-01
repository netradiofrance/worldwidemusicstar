import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/unsubscribe — handles both Gmail one-click (RFC 8058) and the
 * confirmation form on /unsubscribe.
 *
 * Gmail one-click sends a POST with `application/x-www-form-urlencoded`
 * body containing `List-Unsubscribe=One-Click`. We accept that and any
 * POST carrying an `email` parameter (form, fetch, JSON, etc.).
 *
 * We mark every track belonging to the email with `unsubscribed_at`.
 * The reminder cron skips tracks that have this set.
 *
 * We always respond 200 OK even on "not found" to avoid leaking which
 * addresses are in our DB.
 */
export async function POST(req: Request) {
  // Try to extract email from form body, JSON body, or query string
  let email: string | null = null;

  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body = await req.json();
      email = (body?.email as string | undefined) ?? null;
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const v = form.get('email');
      if (typeof v === 'string') email = v;
    }
  } catch { /* fall through to query */ }

  if (!email) {
    const url = new URL(req.url);
    email = url.searchParams.get('email');
  }

  if (!email) {
    // Gmail one-click POST with no email in body — try Referer
    const ref = req.headers.get('referer');
    if (ref) {
      try {
        const u = new URL(ref);
        email = u.searchParams.get('email');
      } catch { /* ignore */ }
    }
  }

  if (!email) {
    // Bare 200 — RFC 8058 says we MUST NOT fail loudly, and Gmail's
    // automated one-click sometimes lacks identifying body content
    return NextResponse.json({ ok: true });
  }

  const sb = createServerClient();
  await sb
    .from('tracks')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email);

  // For browser form submissions, redirect to a friendly confirmation page.
  // For Gmail's automated POST, a JSON 200 is fine — Gmail does not parse
  // the body, only the status code.
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return NextResponse.redirect(new URL('/unsubscribe/done', req.url), { status: 303 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  // Some clients fetch List-Unsubscribe URLs with GET — same behavior
  return POST(req);
}
