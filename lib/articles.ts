import { createServerClient } from './supabase';
import type { Article, GenreSlug } from './database.types';

export async function getPublishedArticles(limit = 24): Promise<Article[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Articles featuring a specific artist. We search for the artist's name
 * in title and excerpt (case-insensitive). Useful for the track page
 * "More about this artist" section.
 *
 * Postgres ILIKE is fine at our scale; if the table grows past ~50k
 * articles, we'd switch to a tsvector index.
 */
export async function getArticlesByArtist(
  artistName: string,
  limit = 6,
): Promise<Article[]> {
  if (!artistName?.trim()) return [];
  const sb = createServerClient();
  const term = artistName.trim().replace(/[%_]/g, '\\$&');
  const { data, error } = await sb
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,body_md.ilike.%${term}%`)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[getArticlesByArtist]', error);
    return [];
  }
  return data ?? [];
}

/**
 * "More articles like this" — first articles mentioning the artist,
 * then if the slot isn't filled, articles in the same genre, then
 * any latest article. Avoids returning the same article twice.
 *
 * Used on the track page to fill the recommendation strip even when
 * the AI hasn't written about the artist yet.
 */
export async function getRelatedArticles(opts: {
  artistName?: string;
  genre?: GenreSlug | string;
  excludeSlug?: string;
  limit?: number;
}): Promise<Article[]> {
  const limit = opts.limit ?? 4;
  const sb = createServerClient();
  const seen = new Set<string>();
  const collected: Article[] = [];

  function add(rows: Article[]) {
    for (const r of rows) {
      if (collected.length >= limit) return;
      if (opts.excludeSlug && r.slug === opts.excludeSlug) continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      collected.push(r);
    }
  }

  // 1. Articles mentioning the artist
  if (opts.artistName) {
    add(await getArticlesByArtist(opts.artistName, limit));
  }

  // 2. Same-genre articles
  if (collected.length < limit && opts.genre) {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .eq('related_genre', opts.genre)
      .order('published_at', { ascending: false })
      .limit(limit);
    add(data ?? []);
  }

  // 3. Any recent article
  if (collected.length < limit) {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    add(data ?? []);
  }

  return collected;
}
