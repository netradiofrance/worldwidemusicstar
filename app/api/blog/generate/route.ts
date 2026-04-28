import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import slugify from 'slugify';
import { createServerClient } from '@/lib/supabase';
import { PUBLIC_GENRES, GENRE_BY_SLUG } from '@/lib/genres';
import { getOverallTop, getTopOfGenre } from '@/lib/charts';
import type { GenreSlug } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Generates a single blog article and saves it as DRAFT (admin validates
 * before publishing). Topics rotate based on which genre's top has
 * changed most recently, plus general music industry pieces.
 *
 * Body params (POST, optional — all optional, sensible defaults):
 *   { topic?: 'genre-spotlight' | 'industry' | 'chart-recap',
 *     genre?: GenreSlug, autoPublish?: boolean }
 */
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  return generate(body);
}
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return generate({});
}

interface GenInput {
  topic?: 'genre-spotlight' | 'industry' | 'chart-recap';
  genre?: GenreSlug;
  autoPublish?: boolean;
}

async function generate(input: GenInput) {
  const sb = createServerClient();

  const topic: NonNullable<GenInput['topic']> =
    input.topic ?? pickRandom(['genre-spotlight','industry','chart-recap']);

  const genreSlug: GenreSlug =
    input.genre ?? (PUBLIC_GENRES[Math.floor(Math.random() * PUBLIC_GENRES.length)].slug as GenreSlug);
  const genre = GENRE_BY_SLUG[genreSlug];

  // Build context for Claude
  let chartContext = '';
  try {
    if (topic === 'genre-spotlight') {
      const top = await getTopOfGenre(genreSlug, 10);
      chartContext = top.length
        ? `Current top of the ${genre.name} chart on WorldWide Music Star:\n` +
          top.map((t, i) => `${i + 1}. ${t.artist_name} — "${t.song_title}" (votes: ${t.votes_count}, spotify: ${t.spotify_followers}, youtube: ${t.youtube_subscribers})`).join('\n')
        : '';
    } else if (topic === 'chart-recap') {
      const top = await getOverallTop(10);
      chartContext = top.length
        ? `Current overall top 10 on WorldWide Music Star:\n` +
          top.map((t, i) => `${i + 1}. ${t.artist_name} — "${t.song_title}" (${GENRE_BY_SLUG[t.genre]?.name})`).join('\n')
        : '';
    }
  } catch { /* non-fatal */ }

  // ----- Generate article with Claude -----
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt =
    `You are a senior music journalist writing for WorldWide Music Star, a global ` +
    `chart platform powered by fan votes, Spotify followers and YouTube subscribers. ` +
    `Write in clear, engaging English. Tone is informed, lively, never hype-y. ` +
    `Output must be valid JSON ONLY (no preamble) with this shape:\n` +
    `{"title": "...", "excerpt": "...", "content_md": "...", "cover_prompt": "..."}\n\n` +
    `Rules:\n` +
    `- title: 6-10 words, no clickbait\n` +
    `- excerpt: one sentence (180-240 chars)\n` +
    `- content_md: ~600-800 words, valid markdown using ## for sections (3-5 sections), ` +
    `  short paragraphs, no lists unless they aid readability. No image references.\n` +
    `- cover_prompt: a short, vivid prompt for a cover image (no real artist names, ` +
    `  cinematic lighting, music-related visual metaphor, no text in image).`;

  const userPrompt =
    topic === 'genre-spotlight'
      ? `Write a spotlight piece on emerging trends in the ${genre.name} genre right now. ${chartContext ? `Use this real-world chart context (you may reference acts but be tasteful): \n\n${chartContext}` : ''}`
      : topic === 'chart-recap'
        ? `Write a chart recap of what's hot across the WorldWide Music Star charts this week. ${chartContext ? `Live data:\n\n${chartContext}` : ''}`
        : `Write an op-ed style piece on a music-industry topic relevant to independent artists today. Pick one specific angle (streaming royalties, fan-driven discovery, social media saturation, AI in music, the role of charts, etc.) and develop it.`;

  let parsed: { title: string; excerpt: string; content_md: string; cover_prompt: string };
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
    // Strip ```json fences if any
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[blog/generate] claude error:', e);
    return NextResponse.json({ error: 'Article generation failed' }, { status: 502 });
  }

  // ----- Generate cover image with OpenAI -----
  let coverUrl: string | null = null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const img = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `${parsed.cover_prompt}. Cinematic, editorial photography style, dramatic lighting, no text, no watermarks.`,
      size: '1536x1024',
      n: 1,
    });
    const b64 = img.data?.[0]?.b64_json;
    const imgUrl = img.data?.[0]?.url;
    if (b64) {
      // Upload to Supabase Storage (bucket "blog-covers" must exist with public read)
      const bytes = Buffer.from(b64, 'base64');
      const path = `${Date.now()}-${slugify(parsed.title, { lower: true, strict: true }).slice(0, 60)}.png`;
      const { data: up, error: upErr } = await sb.storage
        .from('blog-covers')
        .upload(path, bytes, { contentType: 'image/png', upsert: false });
      if (!upErr && up) {
        const { data: pub } = sb.storage.from('blog-covers').getPublicUrl(up.path);
        coverUrl = pub.publicUrl;
      }
    } else if (imgUrl) {
      coverUrl = imgUrl;
    }
  } catch (e) {
    console.error('[blog/generate] openai image error:', e);
  }

  // ----- Save article -----
  const baseSlug = slugify(parsed.title, { lower: true, strict: true }).slice(0, 80);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const status = input.autoPublish ? 'published' : 'draft';
  const { data: article, error: insertErr } = await sb.from('articles').insert({
    slug,
    title: parsed.title,
    excerpt: parsed.excerpt,
    content_md: parsed.content_md,
    cover_url: coverUrl,
    cover_prompt: parsed.cover_prompt,
    related_genre: topic === 'genre-spotlight' ? genreSlug : null,
    status: status as any,
    generated_by: 'claude',
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).select('id, slug, status').single();

  if (insertErr) {
    console.error('[blog/generate] insert error:', insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, article, topic, genre: genreSlug });
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
