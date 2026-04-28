import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChartRow } from '@/components/charts/ChartRow';
import { GENRE_BY_SLUG, PUBLIC_GENRES } from '@/lib/genres';
import { getOverallTop, getTopOfGenre } from '@/lib/charts';
import type { GenreSlug } from '@/lib/database.types';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ genre: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  return [{ genre: 'all' }, ...PUBLIC_GENRES.map(g => ({ genre: g.slug }))];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { genre } = await params;
  const meta = GENRE_BY_SLUG[genre];
  if (!meta) return {};
  return {
    title: `${meta.name} Chart`,
    description: meta.description,
    openGraph: {
      title: `${meta.name} Chart — WorldWide Music Star`,
      description: meta.description,
    },
  };
}

export default async function ChartPage({ params }: PageProps) {
  const { genre } = await params;
  const meta = GENRE_BY_SLUG[genre];
  if (!meta) notFound();

  const tracks =
    genre === 'all'
      ? await getOverallTop(50)
      : await getTopOfGenre(genre as GenreSlug, 50);

  const now = new Date();
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <>
      {/* Page hero */}
      <section className="border-b border-white/5 bg-ambient-red">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">
            {monthLabel} · Live ranking
          </div>
          <h1 className="font-display uppercase text-5xl sm:text-7xl tracking-tightest mb-3">
            {meta.name} Chart
          </h1>
          <p className="text-ink-200 text-lg max-w-2xl">{meta.description}</p>

          {/* Sub-genre nav (chips) */}
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/charts/all"
              className={[
                'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                genre === 'all'
                  ? 'bg-brand text-white'
                  : 'bg-white/5 hover:bg-white/10 text-ink-100',
              ].join(' ')}
            >
              All Charts
            </Link>
            {PUBLIC_GENRES.map(g => (
              <Link
                key={g.slug}
                href={`/charts/${g.slug}`}
                className={[
                  'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                  genre === g.slug
                    ? 'bg-brand text-white'
                    : 'bg-white/5 hover:bg-white/10 text-ink-100',
                ].join(' ')}
              >
                {g.short}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Chart table */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-ink-800 p-10 text-center">
            <h2 className="font-display uppercase text-3xl mb-3">No entries yet</h2>
            <p className="text-ink-300 max-w-md mx-auto mb-6">
              Be the first artist to chart in {meta.name}. Add your song and rally
              your fans.
            </p>
            <Link
              href="/add-a-song"
              className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3"
            >
              Add Your Song
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink-800/50 overflow-hidden">
            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[64px_72px_1fr_repeat(3,minmax(80px,auto))_120px] gap-4 px-5 py-3 border-b border-white/10 text-[10px] uppercase tracking-widest text-ink-400 font-semibold">
              <div className="text-center">Rank</div>
              <div></div>
              <div>Track</div>
              <div className="text-center">Votes</div>
              <div className="text-center">Spotify</div>
              <div className="text-center">YouTube</div>
              <div className="text-right">Action</div>
            </div>
            {tracks.map((t, i) => (
              <ChartRow key={t.id} rank={i + 1} track={t} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
