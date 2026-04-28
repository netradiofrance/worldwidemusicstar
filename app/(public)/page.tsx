import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Trophy, Sparkles } from 'lucide-react';
import { GenreNumberOneCard } from '@/components/charts/GenreNumberOneCard';
import { CoverImage } from '@/components/charts/CoverImage';
import { VoteButton } from '@/components/charts/VoteButton';
import { GENRE_BY_SLUG, PUBLIC_GENRES } from '@/lib/genres';
import { getNumberOnePerGenre, getOverallTop } from '@/lib/charts';
import { getPublishedArticles } from '@/lib/articles';
import { formatNumber } from '@/lib/scoring';
import type { GenreSlug } from '@/lib/database.types';

export const revalidate = 60; // ISR — page rebuilds at most every 60s

export default async function HomePage() {
  const [numberOnes, overallTop, articles] = await Promise.all([
    getNumberOnePerGenre(),
    getOverallTop(10),
    getPublishedArticles(3),
  ]);

  const overallNumberOne = overallTop[0] ?? null;

  return (
    <>
      {/* HERO — overall #1 */}
      <section className="bg-ambient-red border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse-dot" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand">
                  Overall Chart · Updated Live
                </span>
              </div>
              <h1 className="font-display uppercase text-5xl sm:text-7xl lg:text-8xl leading-[0.92] tracking-tightest mb-6">
                The Power<br />to be <span className="text-brand">charted.</span>
              </h1>
              <p className="text-ink-200 text-lg leading-relaxed max-w-xl mb-8">
                The global music chart platform powered by fan votes, Spotify followers and YouTube subscribers.
                Where independent artists become stars.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/add-a-song"
                  className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3 transition-colors"
                >
                  Add a Song <ArrowUpRight size={18} />
                </Link>
                <Link
                  href="/charts/all"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3 transition-colors"
                >
                  View All Charts
                </Link>
              </div>
            </div>

            {/* Hero #1 card — div instead of Link, so the VoteButton (Client
                Component) can have its own click handler without conflicting
                with an outer Link. The track name is itself a link. */}
            {overallNumberOne ? (
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 backdrop-blur p-6 sm:p-8 hover:border-brand/50 transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-brand">
                    #1 · All Charts
                  </div>
                  <Trophy size={18} className="text-brand" />
                </div>
                <div className="flex items-start gap-5">
                  <CoverImage
                    src={overallNumberOne.cover_url}
                    alt={overallNumberOne.artist_name}
                    size={140}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/track/${overallNumberOne.id}`}
                      className="block font-display text-3xl sm:text-4xl uppercase tracking-tightest leading-none mb-2 truncate hover:text-brand transition-colors"
                    >
                      {overallNumberOne.song_title}
                    </Link>
                    <div className="text-ink-200 text-lg mb-4 truncate">{overallNumberOne.artist_name}</div>
                    <div className="text-[11px] uppercase tracking-widest text-ink-400">
                      {GENRE_BY_SLUG[overallNumberOne.genre]?.name ?? overallNumberOne.genre}
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-md bg-ink-800 px-3 py-3 text-center">
                    <div className="text-white font-semibold tabular-nums">{formatNumber(overallNumberOne.votes_count)}</div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">Votes</div>
                  </div>
                  <div className="rounded-md bg-ink-800 px-3 py-3 text-center">
                    <div className="text-white font-semibold tabular-nums">{formatNumber(overallNumberOne.spotify_followers)}</div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">Spotify</div>
                  </div>
                  <div className="rounded-md bg-ink-800 px-3 py-3 text-center">
                    <div className="text-white font-semibold tabular-nums">{formatNumber(overallNumberOne.youtube_subscribers)}</div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">YouTube</div>
                  </div>
                </div>
                <div className="mt-5 flex justify-between items-center">
                  <Link
                    href={`/track/${overallNumberOne.id}`}
                    className="text-sm text-ink-300 hover:text-white inline-flex items-center gap-1"
                  >
                    View page <ArrowUpRight size={14} />
                  </Link>
                  <VoteButton trackId={overallNumberOne.id} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-8 text-center">
                <Sparkles className="mx-auto text-brand mb-4" size={28} />
                <div className="text-2xl font-display uppercase mb-2">No charts yet</div>
                <p className="text-ink-300 mb-6">Be the first artist to claim the top spot.</p>
                <Link href="/add-a-song" className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3">
                  Add Your Song <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GENRE #1 GRID */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-2">
                #1 by genre
              </h2>
              <p className="text-ink-300">Tap a card to see the full chart.</p>
            </div>
            <Link
              href="/charts/all"
              className="text-sm font-semibold text-brand hover:text-white inline-flex items-center gap-1"
            >
              See full overall chart <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PUBLIC_GENRES.map(g => (
              <GenreNumberOneCard
                key={g.slug}
                genre={g}
                track={(numberOnes as Record<GenreSlug, any>)[g.slug as GenreSlug] ?? null}
              />
            ))}
          </div>
        </div>
      </section>

      {/* AWARD BANNER */}
      <section className="border-b border-white/5 bg-gradient-to-br from-ink-900 via-ink-900 to-brand/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-4">
                Award of the Month
              </div>
              <h2 className="font-display uppercase text-4xl sm:text-6xl tracking-tightest leading-[0.95] mb-5">
                Win the<br />trophy.
              </h2>
              <p className="text-ink-200 text-lg leading-relaxed mb-6 max-w-md">
                Each month, the artist with the most fan votes — across every genre —
                takes home the WorldWide Music Star award. Real recognition. Real prize.
                Real proof.
              </p>
              <Link
                href="/add-a-song"
                className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3 transition-colors"
              >
                Enter the Race <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <Image
                src="/images/trophy.jpg"
                alt="WorldWide Music Star Award trophy"
                width={520}
                height={520}
                className="rounded-2xl shadow-[0_30px_80px_rgba(214,40,40,0.3)] max-w-sm w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* LATEST NEWS */}
      {articles.length > 0 && (
        <section className="border-b border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <h2 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest">
                Music blog
              </h2>
              <Link
                href="/blog"
                className="text-sm font-semibold text-brand hover:text-white inline-flex items-center gap-1"
              >
                All articles <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {articles.map(a => (
                <Link
                  key={a.id}
                  href={`/blog/${a.slug}`}
                  className="group block rounded-xl bg-ink-800 border border-white/5 hover:border-brand/40 transition-colors overflow-hidden"
                >
                  {a.cover_url ? (
                    <Image
                      src={a.cover_url}
                      alt={a.title}
                      width={640}
                      height={360}
                      className="aspect-video object-cover w-full"
                    />
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
          </div>
        </section>
      )}

      {/* CTA STRIP */}
      <section className="bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 text-center">
          <h2 className="font-display uppercase text-5xl sm:text-7xl tracking-tightest mb-4">
            Ready to be<br /><span className="text-brand">charted?</span>
          </h2>
          <p className="text-ink-200 text-lg mb-8 max-w-xl mx-auto">
            One flat fee. Real fans. Real ranking. Real award. The path to the top starts here.
          </p>
          <Link
            href="/add-a-song"
            className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-8 py-4 text-lg transition-colors"
          >
            Add Your Song <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
    </>
  );
}
