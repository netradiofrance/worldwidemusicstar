import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getArticleBySlug } from '@/lib/articles';
import { renderMarkdown } from '@/lib/markdown';
import { GENRE_BY_SLUG } from '@/lib/genres';
import type { Metadata } from 'next';

interface PageProps { params: Promise<{ slug: string }> }

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.excerpt ?? a.title,
    openGraph: {
      title: a.title,
      description: a.excerpt ?? '',
      images: a.cover_url ? [{ url: a.cover_url }] : [],
      type: 'article',
      publishedTime: a.published_at ?? undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) notFound();

  const html = renderMarkdown(a.content_md);
  const date = a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : null;

  return (
    <article>
      {/* Article hero */}
      <div className="border-b border-white/5 bg-ambient-red">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white mb-8">
            <ArrowLeft size={14} /> Back to blog
          </Link>
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">
            {a.related_genre ? GENRE_BY_SLUG[a.related_genre]?.name : 'News'} {date ? ` · ${date}` : ''}
          </div>
          <h1 className="font-display uppercase text-4xl sm:text-6xl tracking-tightest leading-[0.95] mb-4">
            {a.title}
          </h1>
          {a.excerpt && (
            <p className="text-ink-200 text-xl leading-relaxed">{a.excerpt}</p>
          )}
        </div>
      </div>

      {a.cover_url && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-6">
          <Image src={a.cover_url} alt={a.title} width={1600} height={900}
                 className="rounded-2xl w-full aspect-video object-cover" priority />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div
          className="prose-wwms"
          // SAFETY: content comes from our DB (admin-written or AI-generated then admin-validated by default).
          // The renderer escapes raw input; only our own tags pass through.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
        <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-5 py-2.5 text-sm">
          <ArrowLeft size={14} /> All articles
        </Link>
      </div>
    </article>
  );
}
