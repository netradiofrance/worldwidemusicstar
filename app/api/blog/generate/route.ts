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
 * Generate ONE blog article and save it as DRAFT (admin validates before publish).
 *
 * Anti-duplicate strategy
 * -----------------------
 * The platform was hitting two failure modes:
 *  1. Same theme rewritten weeks apart ("The Algorithm Is Not Your A&R" vs
 *     "The Algorithm Is Not Your A&R: Reclaiming Indie Discovery").
 *  2. Same genre spotlit twice in a short window.
 *
 * Mitigations layered here (cheapest first, most aggressive last):
 *
 *   a. Smart topic selection — instead of uniform random, we look at the
 *      last 14 days of articles and pick whichever topic has been used
 *      LEAST. Same logic for the genre when topic = 'genre-spotlight'.
 *
 *   b. Recent-articles context — we feed the LLM the titles + excerpts
 *      of the last 40 published articles with explicit instruction to
 *      pick a fresh angle that does NOT overlap.
 *
 *   c. Post-hoc title similarity check — Jaccard distance on word sets.
 *      If the generated title overlaps >50% with any recent title, we
 *      retry once with even stronger anti-duplicate framing. After 2
 *      total attempts we give up to avoid burning API quota.
 *
 * Body params (POST, all optional):
 *   { topic?, genre?, autoPublish? }
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

interface RecentArticle {
  title: string;
  excerpt: string | null;
  related_genre: GenreSlug | null;
  created_at: string;
}

const SIMILARITY_THRESHOLD = 0.5;
const RECENCY_WINDOW_DAYS = 14;
const RECENT_ARTICLES_FOR_CONTEXT = 40;

async function generate(input: GenInput) {
  const sb = createServerClient();

  // ---------- 1. Pull recent articles to drive both topic selection and prompting ----------
  const { data: recentRows } = await sb
    .from('articles')
    .select('title, excerpt, related_genre, created_at')
    .order('created_at', { ascending: false })
    .limit(RECENT_ARTICLES_FOR_CONTEXT);
  const recent: RecentArticle[] = recentRows ?? [];

  // ---------- 2. Smart topic selection (least-used in last 14 days) ----------
  const since = Date.now() - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentInWindow = recent.filter(a => new Date(a.created_at).getTime() > since);

  const topic = input.topic ?? pickLeastUsedTopic(recentInWindow);
  const genreSlug: GenreSlug = input.genre ?? pickLeastUsedGenre(recentInWindow);
  const genre = GENRE_BY_SLUG[genreSlug];

  // ---------- 3. Build chart context (real data the LLM can quote) ----------
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

  // ---------- 4. Generate (with one retry on duplicate-title detection) ----------
  let parsed: { title: string; excerpt: string; content_md: string; cover_prompt: string } | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const stricter = attempt > 1;
    try {
      parsed = await callLLM({ topic, genre, chartContext, recent, stricter });
    } catch (e: any) {
      lastError = e?.message ?? String(e);
      console.error(`[blog/generate] LLM attempt ${attempt} failed:`, lastError);
      continue;
    }

    const dup = findDuplicate(parsed.title, recent);
    if (!dup) break;
    console.warn(`[blog/generate] attempt ${attempt} produced near-duplicate of "${dup.title}" — retrying`);
    parsed = null;
  }

  if (!parsed) {
    return NextResponse.json(
      { error: lastError ?? 'Could not generate a fresh article. Try again later.' },
      { status: 502 },
    );
  }

  // ---------- 5. Generate cover image with OpenAI (best effort) ----------
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
    const imgUrl = (img.data?.[0] as any)?.url;
    if (b64) {
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

  // ---------- 6. Save article ----------
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

// ============================================================
// LLM call
// ============================================================

async function callLLM(args: {
  topic: 'genre-spotlight' | 'industry' | 'chart-recap';
  genre: ReturnType<typeof GENRE_BY_SLUG[string] extends never ? never : (typeof GENRE_BY_SLUG)[string]>;
  chartContext: string;
  recent: RecentArticle[];
  stricter: boolean;
}): Promise<{ title: string; excerpt: string; content_md: string; cover_prompt: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Format the "do not write about these" list
  const forbiddenList = args.recent.length > 0
    ? args.recent.slice(0, 30).map((a, i) =>
        `${i + 1}. "${a.title}"${a.excerpt ? ` — ${a.excerpt.slice(0, 140)}` : ''}`,
      ).join('\n')
    : '(no prior articles yet)';

  const systemPrompt = [
    `You are a senior music journalist writing for WorldWide Music Star, a global chart platform powered by fan votes, Spotify followers and YouTube subscribers.`,
    `Write in clear, engaging English. Tone is informed, lively, never hype-y.`,
    ``,
    `Output must be valid JSON ONLY (no preamble) with this exact shape:`,
    `{"title": "...", "excerpt": "...", "content_md": "...", "cover_prompt": "..."}`,
    ``,
    `Rules:`,
    `- title: 6-10 words, no clickbait, no colons that re-state the previous title`,
    `- excerpt: one sentence, 180-240 chars, no clickbait`,
    `- content_md: 600-800 words, valid markdown using ## for sections (3-5 sections), short paragraphs, no lists unless they aid readability, no image references`,
    `- cover_prompt: a short, vivid prompt for a cover image (no real artist names, cinematic lighting, music-related visual metaphor, no text in image)`,
    ``,
    `CRITICAL — avoid duplication:`,
    `Below is a list of articles already published on this site. You MUST pick a fresh angle that does NOT overlap with any of these. Do NOT rephrase, do NOT continue, do NOT pick a sub-aspect of an existing piece. Pick a genuinely different topic, or — if forced into a familiar territory — find a strikingly different angle, voice or framing.`,
    ``,
    `Already-published articles to AVOID:`,
    forbiddenList,
    ``,
    args.stricter
      ? `IMPORTANT: A previous attempt produced a near-duplicate. Be especially vigilant — the title and the angle must be unmistakably different from every entry above. If in doubt, change the angle entirely.`
      : ``,
  ].filter(Boolean).join('\n');

  const userPrompt =
    args.topic === 'genre-spotlight'
      ? `Write a spotlight piece on emerging trends in the ${args.genre.name} genre right now. ${args.chartContext ? `Use this real-world chart context (you may reference acts but be tasteful):\n\n${args.chartContext}` : ''}`
      : args.topic === 'chart-recap'
        ? `Write a chart recap of what's hot across the WorldWide Music Star charts this week. ${args.chartContext ? `Live data:\n\n${args.chartContext}` : ''}`
        : `Write an op-ed style piece on a music-industry topic relevant to independent artists today. Pick one specific angle that is NOT already covered above (streaming royalties, fan-driven discovery, social media saturation, AI in music, the role of charts, touring economics, sync licensing, the death of the album, niche communities, etc.) and develop it.`;

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
  return JSON.parse(cleaned);
}

// ============================================================
// Topic / genre selection helpers
// ============================================================

function pickLeastUsedTopic(recentInWindow: RecentArticle[]): NonNullable<GenInput['topic']> {
  // Heuristic: articles with related_genre set are genre-spotlight,
  // articles whose title contains "chart" or "recap" or "this week" are recaps,
  // everything else is industry.
  const counts: Record<NonNullable<GenInput['topic']>, number> = {
    'genre-spotlight': 0,
    'chart-recap':     0,
    'industry':        0,
  };
  for (const a of recentInWindow) {
    if (a.related_genre) counts['genre-spotlight']++;
    else if (/\b(chart|recap|this week|top \d|weekly)\b/i.test(a.title)) counts['chart-recap']++;
    else counts['industry']++;
  }
  // Pick the topic with the lowest count; ties broken in this order
  const order: Array<NonNullable<GenInput['topic']>> = ['industry', 'genre-spotlight', 'chart-recap'];
  let best = order[0];
  for (const t of order) {
    if (counts[t] < counts[best]) best = t;
  }
  return best;
}

function pickLeastUsedGenre(recentInWindow: RecentArticle[]): GenreSlug {
  const counts = new Map<string, number>();
  for (const g of PUBLIC_GENRES) counts.set(g.slug, 0);
  for (const a of recentInWindow) {
    if (a.related_genre && counts.has(a.related_genre)) {
      counts.set(a.related_genre, (counts.get(a.related_genre) ?? 0) + 1);
    }
  }
  // Find min, then pick uniformly among tied minima for variety
  let min = Infinity;
  for (const v of counts.values()) if (v < min) min = v;
  const candidates: GenreSlug[] = [];
  for (const [slug, v] of counts.entries()) {
    if (v === min) candidates.push(slug as GenreSlug);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ============================================================
// Title similarity check (Jaccard on word sets)
// ============================================================

function tokenize(s: string): Set<string> {
  // Lowercase, strip punctuation, drop very short stopwords-ish noise
  return new Set(
    s.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function findDuplicate(newTitle: string, recent: RecentArticle[]): RecentArticle | null {
  const newTokens = tokenize(newTitle);
  for (const a of recent) {
    if (jaccard(newTokens, tokenize(a.title)) >= SIMILARITY_THRESHOLD) {
      return a;
    }
  }
  return null;
}
