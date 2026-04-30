import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Music2, Youtube } from 'lucide-react';
import { CoverImage } from '@/components/charts/CoverImage';
import { VoteButton } from '@/components/charts/VoteButton';
import { ShareButton } from '@/components/charts/ShareButton';
import { getTrackById } from '@/lib/charts';
import { getRelatedArticles } from '@/lib/articles';
import { GENRE_BY_SLUG } from '@/lib/genres';
import { formatNumber } from '@/lib/scoring';
import type { Metadata } from 'next';

interface PageProps { params: Promise<{ id: string }> }

export const revalidate = 30;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await getTrackById(id);
  if (!track) return {};
  const genre = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
  return {
    title: `${track.song_title} — ${track.artist_name}`,
    description: `${track.artist_name} on the ${genre} chart. Vote, follow, and push them up.`,
    openGraph: {
      title: `${track.song_title} — ${track.artist_name}`,
      description: `On the ${genre} chart on WorldWide Music Star.`,
      images: track.cover_url ? [{ url: track.cover_url }] : [],
    },
  };
}

export default async function TrackPage({ params }: PageProps) {
  const { id } = await params;
  const track = await getTrackById(id);
  if (!track || track.status !== 'active') notFound();

  const genre = GENRE_BY_SLUG[track.genre];

  // Build the shareable URL — absolute is the safe choice for share sheets.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const shareUrl = `${site}/track/${track.id}`;
  const shareTitle = `${track.artist_name} — ${track.song_title}`;
  const shareText = `Vote for ${track.artist_name} on WorldWide Music Star.`;

  // Related articles (artist mentions first, then same-genre, then latest).
  const related = await getRelatedArticles({
    artistName: track.artist_name,
    genre: track.genre,
    limit: 4,
  });

  return (
    <>
      <article className="border-b border-white/5 bg-ambient-red">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
          <Link href={`/charts/${track.genre}`} className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white mb-8">
            <ArrowLeft size={14} /> Back to {genre?.name} chart
          </Link>

          <div className="grid sm:grid-cols-[260px_1fr] gap-8">
            <CoverImage src={track.cover_url} alt={track.artist_name} size={260} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">
                {genre?.name ?? track.genre}
              </div>
              <h1 className="font-display uppercase text-5xl sm:text-6xl tracking-tightest leading-[0.95] mb-2">
                {track.song_title}
              </h1>
              <div className="text-2xl text-ink-100 mb-6">{track.artist_name}</div>

              <div className="grid grid-cols-3 gap-3 max-w-md mb-8">
                <div className="rounded-md bg-ink-800 px-3 py-3 text-center">
                  <div className="text-white font-semibold text-lg tabular-nums">{formatNumber(track.votes_count)}</div>
                  <div className="text-[10px] text-ink-400 uppercase tracking-wider">Votes</div>
                </div>
                <div className="rounded-md bg-ink-800 px-3 py-3 text-center">
                  <div className="text-white font-semibold text-lg tabular-nums">{formatNumber(track.spotify_followers)}</div>
                  <div className="text-[10px] text-ink-400 uppercase tracking-wider">Spotify</div>
                </div>
                <div className="rounded-md bg-ink-800 px-3 py-3 text-center">
                  <div className="text-white font-semibold text-lg tabular-nums">{formatNumber(track.youtube_subscribers)}</div>
                  <div className="text-[10px] text-ink-400 uppercase tracking-wider">YouTube</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <VoteButton trackId={track.id} />
                <ShareButton url={shareUrl} title={shareTitle} text={shareText} variant="full" />
                {track.spotify_url && (
                  <a href={track.spotify_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-5 py-2.5 text-sm">
                    <Music2 size={16} /> Listen on Spotify <ExternalLink size={12} />
                  </a>
                )}
                {track.youtube_url && (
                  <a href={track.youtube_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-5 py-2.5 text-sm">
                    <Youtube size={16} /> Watch on YouTube <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <p className="text-ink-300 text-sm max-w-xl">
                Help {track.artist_name} climb the chart. One vote = one ad. The more your fans vote, the higher you rank.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* RELATED ARTICLES — articles mentioning this artist, same-genre, or latest. */}
      {related.length > 0 && (
        <section className="border-b border-white/5">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-2">
                  More to read
                </div>
                <h2 className="font-display uppercase text-3xl sm:text-4xl tracking-tightest">
                  About {track.artist_name}
                </h2>
              </div>
              <Link href="/blog" className="text-sm text-brand hover:text-white inline-flex items-center gap-1">
                All articles
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(a => (
                <Link
                  key={a.id}
                  href={`/blog/${a.slug}`}
                  className="group block rounded-xl bg-ink-800 border border-white/5 hover:border-brand/40 transition-colors overflow-hidden"
                >
                  {a.cover_url ? (
                    <Image
                      src={a.cover_url}
                      alt={a.title}
                      width={480}
                      height={270}
                      className="aspect-video object-cover w-full"
                    />
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-brand/20 to-ink-700" />
                  )}
                  <div className="p-4">
                    <div className="text-[10px] uppercase tracking-widest text-brand mb-2">
                      {a.related_genre ? GENRE_BY_SLUG[a.related_genre]?.name : 'News'}
                    </div>
                    <h3 className="text-base font-semibold leading-snug group-hover:text-brand transition-colors line-clamp-3">
                      {a.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
