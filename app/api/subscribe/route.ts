import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid email' }, { status: 400 }); }

  const sb = createServerClient();
  const { error } = await sb.from('subscribers').upsert(
    { email: body.email.toLowerCase().trim(), source: body.source ?? 'home' },
    { onConflict: 'email' },
  );
  if (error) {
    console.error('[subscribe] insert error:', error);
    return NextResponse.json({ error: 'Could not subscribe' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
