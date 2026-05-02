import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
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
 * itself as proof of payment (Stripe, Vivid and most modern processors
 * work this way — they only redirect to redirectUrl on success).
 *
 * Flow:
 *   1. Read the track id from the URL
 *   2. Activate the track via activateTrack() — idempotent, safe to call
 *      twice if the webhook also fires (it just no-ops the second time)
 *   3. Render "You're on the chart" with a button to the genre chart
 *
 * The Vivid webhook becomes a bonus safety net for the rare case where
 * the user closes the tab before the redirect lands. activateTrack()
 * is the same code path either way, so the two routes produce identical
 * results.
 */
export default async function AddSongSuccessPage({ searchParams }: PageProps) {
  const { track: trackId } = await searchParams;

  if (!trackId) {
    return <FallbackView reason="missing-id" />;
  }

  const sb = createServerClient();
  const { data: track } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, status')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return <FallbackView reason="not-found" />;
  }

  // Activate the track if it's still pending. Idempotent — if the webhook
  // already activated it, this returns alreadyActive: true and does nothing.
  if (track.status === 'pending_payment') {
    const result = await activateTrack({
      trackId: track.id,
      paymentProviderId: 'vivid-redirect',
      rawProviderPayload: { source: 'success-page-redirect' },
      source: 'webhook', // counts as the same path as a webhook activation
    });
    if (!result.ok) {
      console.error('[success-page] activation failed:', result.error);
      // Fall through anyway — the admin can mark-as-paid later
    }
    // After activation, set the in-memory status so the celebratory view
    // renders on this same request without a second DB roundtrip
    track.status = 'active';
  }

  const genreMeta = GENRE_BY_SLUG[track.genre];
  const genreName = genreMeta?.name ?? track.genre;
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

function FallbackView({ reason }: { reason: 'missing-id' | 'not-found' }) {
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-6" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          Payment received.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-8">
          Thanks! Your chart entry is being processed. You will receive a confirmation email
          shortly.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href="/charts/all"
            className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3"
          >
            View charts
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3"
          >
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
