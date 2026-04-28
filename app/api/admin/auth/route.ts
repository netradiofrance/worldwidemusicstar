import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase';
import { createAdminToken, setAdminCookie, clearAdminCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.enum(['login','logout']).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (body.action === 'logout') {
    await clearAdminCookie();
    return NextResponse.json({ ok: true });
  }

  const sb = createServerClient();
  const { data: user, error } = await sb
    .from('admin_users')
    .select('*')
    .eq('email', body.email.toLowerCase())
    .maybeSingle();
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = await bcrypt.compare(body.password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createAdminToken({ sub: user.id, email: user.email, role: user.role });
  await setAdminCookie(token);
  await sb.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
