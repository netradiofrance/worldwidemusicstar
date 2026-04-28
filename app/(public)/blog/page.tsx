import Link from 'next/link';
import Image from 'next/image';
import { getPublishedArticles } from '@/lib/articles';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const revalidate = 60;
export const metadata = {
  title: 'Music Blog',
  description: 'Music news, indie spotlights, chart insights and platform updates.',
};

export default async function BlogIndex() {
  const articles = await getPublishedArticles(40);
  const [featured, ...rest] = articles;

  return (
    <section>
      {/* Header */}
      <div className="border-b border-white/5 bg-ambient-red">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">News & Stories</div>
          <h1 className="font-display uppercase text-5xl sm:text-7xl tracking-tightest mb-3">
            Music blog
          </h1>
          <p className="text-ink-200 text-lg max-w-2xl">
            Insights, spotlights, and chart breakdowns from the WorldWide Music Star team.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {articles.length === 0 ? (
          <p className="text-center text-ink-300 py-20">No articles yet. Stay tuned.</p>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group block rounded-2xl bg-ink-800 border border-white/5 hover:border-brand/40 overflow-hidden mb-10 transition-colors"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  {featured.cover_url ? (
                    <Image src={featured.cover_url} alt={featured.title} width={1200} height={800} className="aspect-video md:aspect-auto md:h-full object-cover w-full" />
                  ) : (
                    <div className="aspect-video md:aspect-auto md:min-h-[280px] bg-gradient-to-br from-brand/30 to-ink-700" />
                  )}
                  <div className="p-8 sm:p-10">
                    <div className="text-[11px] uppercase tracking-widest text-brand mb-3">
                      {featured.related_genre ? GENRE_BY_SLUG[featured.related_genre]?.name : 'Featured'}
                    </div>
                    <h2 className="font-display uppercase text-3xl sm:text-4xl tracking-tightest leading-[1.05] mb-4 group-hover:text-brand transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-ink-300 text-base leading-relaxed">{featured.excerpt}</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(a => (
                  <Link
                    key={a.id}
                    href={`/blog/${a.slug}`}
                    className="group block rounded-xl bg-ink-800 border border-white/5 hover:border-brand/40 transition-colors overflow-hidden"
                  >
                    {a.cover_url ? (
                      <Image src={a.cover_url} alt={a.title} width={640} height={360} className="aspect-video object-cover w-full" />
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-brand/20 to-ink-700" />
                    )}
                    <div className="p-5">
                      <div className="text-[11px] uppercase tracking-widest text-brand mb-2">
                        {a.related_genre ? GENRE_BY_SLUG[a.related_genre]?.name : 'News'}
                      </div>
                      <h3 className="text-lg font-semibold leading-snug mb-2 group-hover:text-brand transition-colors line-clamp-2">
                        {a.title}
                      </h3>
                      <p className="text-ink-300 text-sm line-clamp-2">{a.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
