import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Master cron: refresh all counters and recompute scores.
 * Scheduled in vercel.json — runs every 6h.
 */
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run(req);
}
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run(req);
}

async function run(req: Request) {
  const base = new URL(req.url).origin;
  const headers = { 'x-cron-secret': process.env.CRON_SECRET ?? '' };

  const [spotifyRes, youtubeRes] = await Promise.allSettled([
    fetch(`${base}/api/spotify/refresh`, { method: 'POST', headers, cache: 'no-store' }).then(r => r.json()),
    fetch(`${base}/api/youtube/refresh`, { method: 'POST', headers, cache: 'no-store' }).then(r => r.json()),
  ]);

  return NextResponse.json({
    ok: true,
    spotify: spotifyRes.status === 'fulfilled' ? spotifyRes.value : { error: String(spotifyRes.reason) },
    youtube: youtubeRes.status === 'fulfilled' ? youtubeRes.value : { error: String(youtubeRes.reason) },
  });
}
