import Link from 'next/link';
import { CoverImage } from './CoverImage';
import { formatNumber } from '@/lib/scoring';
import type { Track } from '@/lib/database.types';
import type { GenreMeta } from '@/lib/genres';

interface Props {
  genre: GenreMeta;
  track: Track | null;
}

export function GenreNumberOneCard({ genre, track }: Props) {
  if (!track) {
    return (
      <Link
        href={`/charts/${genre.slug}`}
        className="group block rounded-xl bg-ink-800 border border-white/5 p-5 hover:border-brand/50 hover:bg-ink-700 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[11px] font-bold uppercase tracking-widest ${genre.accentClass}`}>{genre.name}</span>
          <span className="text-[11px] uppercase tracking-widest text-ink-400">No #1 yet</span>
        </div>
        <div className="flex items-center gap-3">
          <CoverImage src={null} alt={genre.name} size={56} />
          <div className="text-ink-300 text-sm">Be the first artist to chart in this genre.</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/charts/${genre.slug}`}
      className="group block rounded-xl bg-ink-800 border border-white/5 hover:border-brand/50 hover:bg-ink-700 transition-colors overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[11px] font-bold uppercase tracking-widest ${genre.accentClass}`}>{genre.name}</span>
          <span className="text-[11px] uppercase tracking-widest text-ink-300 font-bold">#1</span>
        </div>

        <div className="flex items-center gap-4">
          <CoverImage src={track.cover_url} alt={track.artist_name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white truncate group-hover:underline underline-offset-4 decoration-brand decoration-2">
              {track.song_title}
            </div>
            <div className="text-sm text-ink-300 truncate">{track.artist_name}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-ink-700/60 px-2 py-2 text-center">
            <div className="text-white font-semibold">{formatNumber(track.votes_count)}</div>
            <div className="text-ink-400 text-[10px] uppercase tracking-wider">Votes</div>
          </div>
          <div className="rounded-md bg-ink-700/60 px-2 py-2 text-center">
            <div className="text-white font-semibold">{formatNumber(track.spotify_followers)}</div>
            <div className="text-ink-400 text-[10px] uppercase tracking-wider">Spotify</div>
          </div>
          <div className="rounded-md bg-ink-700/60 px-2 py-2 text-center">
            <div className="text-white font-semibold">{formatNumber(track.youtube_subscribers)}</div>
            <div className="text-ink-400 text-[10px] uppercase tracking-wider">YouTube</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
