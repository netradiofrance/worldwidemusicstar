import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { getAdminFromCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Patch = z.object({
  title: z.string().optional(),
  excerpt: z.string().optional(),
  content_md: z.string().optional(),
  cover_url: z.string().nullable().optional(),
  related_genre: z.string().nullable().optional(),
  status: z.enum(['draft','scheduled','published','archived']).optional(),
  published_at: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await params;

  let body;
  try { body = Patch.parse(await req.json()); }
  catch (e: any) { return NextResponse.json({ error: 'Invalid', details: e.errors }, { status: 400 }); }

  const sb = createServerClient();
  const { error } = await sb.from('articles').update(body as any).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await params;
  const sb = createServerClient();
  const { error } = await sb.from('articles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
