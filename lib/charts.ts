import { createServerClient } from './supabase';
import type { GenreSlug, Track } from './database.types';

export async function getTopOfGenre(genre: GenreSlug, limit = 50): Promise<Track[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .eq('genre', genre)
    .eq('status', 'active')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getNumberOnePerGenre(): Promise<Record<GenreSlug, Track | null>> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .eq('status', 'active')
    .order('score', { ascending: false });
  if (error) throw error;

  const out: Partial<Record<GenreSlug, Track>> = {};
  for (const t of data ?? []) {
    if (!out[t.genre as GenreSlug]) out[t.genre as GenreSlug] = t;
  }
  return out as Record<GenreSlug, Track | null>;
}

export async function getOverallTop(limit = 50): Promise<Track[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .eq('status', 'active')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getTrackById(id: string): Promise<Track | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('tracks')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
