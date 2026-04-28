import { NextResponse } from 'next/server';
import { searchTrack } from '@/lib/spotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await searchTrack(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[spotify/search] error:', err);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 502 });
  }
}
