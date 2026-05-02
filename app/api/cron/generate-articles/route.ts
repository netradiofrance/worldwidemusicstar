import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Cron entry — invokes the blog generator.
 *
 * Architectural note — previous version did `fetch()` to /api/blog/generate
 * internally. That had two problems:
 *   1. The fetch passed an x-cron-secret header but production sometimes
 *      did not honor it (returned 401 to itself), and the cron wrapped
 *      that 401 in its own 200 response, hiding the failure.
 *   2. Cold-starting a second function added latency that often pushed
 *      the chain over Hobby's effective time budget.
 *
 * Fix: forward the request to the generator route handler in-process so
 * there is no second function invocation. We import the POST handler
 * from app/api/blog/generate and invoke it with the same Request, just
 * stamped with a fresh x-cron-secret header so authorizeCron passes.
 *
 * The forwarded handler's Response is returned verbatim, so:
 *   - HTTP status reflects whether generation actually succeeded
 *   - The JSON body contains the article id / slug / topic on success,
 *     or the error message on failure
 *   - Vercel logs see the real outcome instead of a misleading 200
 */
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return forward();
}
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return forward();
}

async function forward() {
  console.log('[cron/generate-articles] forwarding to /api/blog/generate handler');
  try {
    // Dynamic import avoids a circular module load at build time
    const mod = await import('@/app/api/blog/generate/route');
    if (typeof mod.POST !== 'function') {
      console.error('[cron/generate-articles] FATAL — blog/generate has no POST export');
      return NextResponse.json(
        { ok: false, error: 'Generator route is missing POST handler' },
        { status: 500 },
      );
    }

    // Build an in-process Request with the cron auth header so the
    // generator's authorizeCron check passes
    const fakeReq = new Request('http://internal/api/blog/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({}),
    });

    const res = await mod.POST(fakeReq);

    // Convert the handler's Response into a NextResponse we can return
    const text = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    console.log('[cron/generate-articles] generator returned status', res.status, parsed);

    return NextResponse.json(
      { ok: res.ok, status: res.status, generator: parsed },
      { status: res.ok ? 200 : 500 },
    );
  } catch (e: any) {
    console.error('[cron/generate-articles] FATAL —', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
