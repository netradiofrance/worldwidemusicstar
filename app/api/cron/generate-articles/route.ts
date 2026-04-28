import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Cron entry — invokes the blog generator. Runs ~4 times a day per
 * vercel.json schedule. Each call generates exactly ONE article (saved
 * as draft for admin review).
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
  const r = await fetch(`${base}/api/blog/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET ?? '',
    },
    body: '{}',
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json({ ok: r.ok, status: r.status, data });
}
