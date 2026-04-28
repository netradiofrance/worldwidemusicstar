import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import slugify from 'slugify';
import { createServerClient } from '@/lib/supabase';
import { getAdminFromCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });
  const { id } = await params;

  const sb = createServerClient();
  const { data: article } = await sb.from('articles').select('*').eq('id', id).maybeSingle();
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = article.cover_prompt
      ?? `Editorial cover for an article titled "${article.title}". Cinematic music photography style, dramatic lighting, no text, no watermarks.`;
    const img = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1536x1024',
      n: 1,
    });

    let coverUrl: string | null = null;
    const b64 = img.data?.[0]?.b64_json;
    if (b64) {
      const bytes = Buffer.from(b64, 'base64');
      const path = `${Date.now()}-${slugify(article.title, { lower: true, strict: true }).slice(0, 60)}.png`;
      const { data: up, error } = await sb.storage.from('blog-covers').upload(path, bytes, {
        contentType: 'image/png', upsert: false,
      });
      if (error) throw error;
      const { data: pub } = sb.storage.from('blog-covers').getPublicUrl(up.path);
      coverUrl = pub.publicUrl;
    } else if (img.data?.[0]?.url) {
      coverUrl = img.data[0].url;
    }

    if (coverUrl) {
      await sb.from('articles').update({ cover_url: coverUrl }).eq('id', id);
    }
    return NextResponse.json({ ok: true, cover_url: coverUrl });
  } catch (e: any) {
    console.error('[regenerate-cover] error:', e);
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 500 });
  }
}
