import { createServerClient } from './supabase';
import type { Article } from './database.types';

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
