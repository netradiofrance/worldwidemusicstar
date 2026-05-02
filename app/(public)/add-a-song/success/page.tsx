import Link from 'next/link';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { createServerClient } from '@/lib/supabase';
import { GENRE_BY_SLUG } from '@/lib/genres';
import { activateTrack } from '@/lib/track-status';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = { title: "You're on the chart" };

interface PageProps {
  searchParams: Promise<{ track?: string }>;
}

/**
 * /add-a-song/success — landing page after the artist completes payment.
 *
 * Vivid redirects the artist here with ?track=<id>. We treat the redirect
 * itself as proof of payment (Vivid only redirects to redirectUrl on
 * actual success).
 *
 * Flow:
 *   1. Read the track id from the URL
 *   2. Activate the track via activateTrack() — idempotent
 *   3. Render "You're on the chart" with buttons to the chart and the
 *      artist's track page
 *
 * If activation fails for any reason, show a polite "we got your payment,
 * we'll activate it shortly" message rather than pretend everything is
 * fine — the admin will see the still-pending track in the dashboard
 * and can mark it paid manually within a few hours.
 */
export default async function AddSongSuccessPage({ searchParams }: PageProps) {
  const { track: trackId } = await searchParams;

  if (!trackId) {
    return <ProcessingView />;
  }

  const sb = createServerClient();
  const { data: track } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, status')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return <ProcessingView />;
  }

  // Activate the track if it's still pending. Idempotent — if the webhook
  // already activated it, this returns alreadyActive: true and does nothing.
  let activationOk = track.status === 'active';
  if (track.status === 'pending_payment') {
    const result = await activateTrack({
      trackId: track.id,
      paymentProviderId: 'vivid-redirect',
      rawProviderPayload: { source: 'success-page-redirect' },
      source: 'redirect',
    });
    if (result.ok) {
      activationOk = true;
    } else {
      console.error('[success-page] activation failed:', result.error);
      // activationOk stays false — render the honest "we'll handle it" view
    }
  }

  if (!activationOk) {
    return <ProcessingView songTitle={track.song_title} />;
  }

  const genreName = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
  const genreChartUrl = `/charts/${track.genre}`;

  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-6" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          You're on the chart.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-3">
          <strong className="text-white">"{track.song_title}"</strong> by{' '}
          <strong className="text-white">{track.artist_name}</strong> is now live on the{' '}
          <strong className="text-white">{genreName}</strong> chart.
        </p>
        <p className="text-ink-300 text-sm mb-8">
          A confirmation email and your receipt are on their way.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href={genreChartUrl}
            className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3"
          >
            See the {genreName} chart
          </Link>
          <Link
            href={`/track/${track.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3"
          >
            View your track page
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function ProcessingView({ songTitle }: { songTitle?: string } = {}) {
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="mx-auto text-amber-300 mb-6" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          Payment received.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-3">
          {songTitle
            ? <>Thanks! We received your payment for <strong className="text-white">"{songTitle}"</strong>. Your chart entry will be activated within a few hours.</>
            : <>Thanks! We received your payment. Your chart entry will be activated within a few hours.</>}
        </p>
        <p className="text-ink-300 text-sm mb-8">
          You will receive a confirmation email as soon as it goes live.
        </p>
        <p className="text-ink-500 text-xs max-w-md mx-auto leading-relaxed">
          Need to follow up?{' '}
          <a href="mailto:contact@worldwidemusicstar.com" className="text-brand hover:underline">
            contact@worldwidemusicstar.com
          </a>
        </p>
      </div>
    </section>
  );
}
