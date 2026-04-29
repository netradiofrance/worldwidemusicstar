import Link from 'next/link';
import { CoverImage } from './CoverImage';
import { VoteButton } from './VoteButton';
import { ShareButton } from './ShareButton';
import { formatNumber } from '@/lib/scoring';
import type { Track } from '@/lib/database.types';

export function ChartRow({ rank, track }: { rank: number; track: Track }) {
  const top3 = rank <= 3;

  // Build the absolute share URL. NEXT_PUBLIC_SITE_URL has no trailing slash
  // and is set on Vercel — fallback to the current origin at runtime via
  // an empty string, the share button will work either way.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const shareUrl = `${site}/track/${track.id}`;
  const shareTitle = `${track.artist_name} — ${track.song_title}`;
  const shareText = `Vote for ${track.artist_name} on WorldWide Music Star.`;

  return (
    <div
      className="chart-row grid grid-cols-[48px_64px_1fr_auto] sm:grid-cols-[64px_72px_1fr_repeat(3,minmax(80px,auto))_auto] items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 border-b border-white/5"
    >
      {/* Rank */}
      <div className="text-center">
        <div
          className={[
            'font-display leading-none',
            top3 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
            rank === 1 ? 'text-brand' : 'text-ink-100',
          ].join(' ')}
        >
          {rank}
        </div>
      </div>

      {/* Cover */}
      <CoverImage src={track.cover_url} alt={track.artist_name} size={56} className="hidden sm:block" />
      <CoverImage src={track.cover_url} alt={track.artist_name} size={48} className="sm:hidden" />

      {/* Title + artist */}
      <Link href={`/track/${track.id}`} className="min-w-0">
        <div className="font-semibold text-white truncate">{track.song_title}</div>
        <div className="text-sm text-ink-300 truncate">{track.artist_name}</div>
      </Link>

      {/* Stats — desktop only */}
      <div className="hidden sm:block text-center">
        <div className="text-white font-semibold tabular-nums">{formatNumber(track.votes_count)}</div>
        <div className="text-[10px] text-ink-400 uppercase tracking-wider">Votes</div>
      </div>
      <div className="hidden sm:block text-center">
        <div className="text-white font-semibold tabular-nums">{formatNumber(track.spotify_followers)}</div>
        <div className="text-[10px] text-ink-400 uppercase tracking-wider">Spotify</div>
      </div>
      <div className="hidden sm:block text-center">
        <div className="text-white font-semibold tabular-nums">{formatNumber(track.youtube_subscribers)}</div>
        <div className="text-[10px] text-ink-400 uppercase tracking-wider">YouTube</div>
      </div>

      {/* Vote + Share buttons */}
      <div className="justify-self-end flex items-center gap-2">
        <VoteButton trackId={track.id} compact />
        <ShareButton url={shareUrl} title={shareTitle} text={shareText} variant="compact" />
      </div>
    </div>
  );
}
