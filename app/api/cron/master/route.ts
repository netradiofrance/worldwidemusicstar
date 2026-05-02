import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * MASTER CRON — runs once a day and orchestrates all four scheduled jobs.
 *
 * Why this exists: Vercel Hobby formally allows only 2 cron jobs per
 * project. With four needs (refresh counters, payment reminders, article
 * generation, monthly archive) we kept hitting that ceiling, and the
 * crons silently never fired. Folding everything into a single cron
 * sidesteps the limit cleanly.
 *
 * Phases run sequentially. Each phase is wrapped in its own try/catch
 * so a failure in one does not skip the others. The response JSON
 * reports each phase's outcome — useful when reading the run log to
 * see which phase needs attention.
 *
 * Implementation note: each phase forwards to the already-existing
 * route handler via dynamic import. We don't duplicate logic — we
 * reuse the handlers as if a normal cron had hit them. The fake
 * Request we hand them carries the cron secret so authorizeCron
 * passes inside the forwarded handler.
 *
 * Schedule (vercel.json): once a day at 06:00 UTC.
 */

interface PhaseResult {
  phase: string;
  ok: boolean;
  status?: number;
  detail?: any;
  elapsedMs: number;
}

export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return runAllPhases();
}
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return runAllPhases();
}

async function runAllPhases() {
  const overallStart = Date.now();
  console.log('[cron/master] START');

  const results: PhaseResult[] = [];

  // PHASE 1 — refresh Spotify + YouTube counters
  results.push(await runPhase(
    'refresh-counters',
    () => import('@/app/api/cron/refresh-counters/route'),
  ));

  // PHASE 2 — payment reminders (abandoned-cart recovery)
  results.push(await runPhase(
    'payment-reminders',
    () => import('@/app/api/cron/payment-reminders/route'),
  ));

  // PHASE 3 — generate one article (least-used topic, anti-duplicate)
  results.push(await runPhase(
    'generate-articles',
    () => import('@/app/api/cron/generate-articles/route'),
  ));

  // PHASE 4 — monthly archive, but only on the first day of the month
  const today = new Date();
  if (today.getUTCDate() === 1) {
    results.push(await runPhase(
      'monthly-archive',
      () => import('@/app/api/cron/monthly-archive/route'),
    ));
  } else {
    results.push({
      phase: 'monthly-archive',
      ok: true,
      detail: 'Skipped — only runs on the 1st of the month',
      elapsedMs: 0,
    });
  }

  const totalElapsed = Date.now() - overallStart;
  const failedPhases = results.filter(r => !r.ok).map(r => r.phase);

  console.log(`[cron/master] DONE in ${totalElapsed}ms — ${results.length} phases, ${failedPhases.length} failed`);

  return NextResponse.json({
    ok: failedPhases.length === 0,
    elapsedMs: totalElapsed,
    failedPhases,
    phases: results,
  });
}

/**
 * Forward a phase to its existing route handler. Catches all errors so
 * one phase blowing up does not abort the rest of the run.
 */
async function runPhase(
  name: string,
  loader: () => Promise<any>,
): Promise<PhaseResult> {
  const start = Date.now();
  try {
    console.log(`[cron/master] phase '${name}' START`);
    const mod = await loader();
    if (typeof mod.POST !== 'function' && typeof mod.GET !== 'function') {
      return {
        phase: name,
        ok: false,
        detail: 'Phase route exposes no POST or GET handler',
        elapsedMs: Date.now() - start,
      };
    }

    // Build a Request the phase handler can authenticate against
    const fakeReq = new Request(`http://internal/api/cron/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({}),
    });

    const handler = mod.POST ?? mod.GET;
    const res: Response = await handler(fakeReq);

    let body: any;
    const text = await res.text();
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    console.log(`[cron/master] phase '${name}' done — status ${res.status}`);

    return {
      phase: name,
      ok: res.ok,
      status: res.status,
      detail: body,
      elapsedMs: Date.now() - start,
    };
  } catch (e: any) {
    console.error(`[cron/master] phase '${name}' threw —`, e);
    return {
      phase: name,
      ok: false,
      detail: e?.message ?? String(e),
      elapsedMs: Date.now() - start,
    };
  }
}
