import type { MetadataRoute } from 'next';
import { PUBLIC_GENRES } from '@/lib/genres';
import { getPublishedArticles } from '@/lib/articles';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/charts/all`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/archives`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/add-a-song`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const genreEntries: MetadataRoute.Sitemap = PUBLIC_GENRES.map(g => ({
    url: `${SITE}/charts/${g.slug}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }));

  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await getPublishedArticles(200);
    articleEntries = articles.map(a => ({
      url: `${SITE}/blog/${a.slug}`,
      lastModified: a.published_at ? new Date(a.published_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {}

  return [...staticEntries, ...genreEntries, ...articleEntries];
}
