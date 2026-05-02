import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { createServerClient } from '@/lib/supabase';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = { title: 'Payment received' };

interface PageProps {
  searchParams: Promise<{ track?: string }>;
}

/**
 * /add-a-song/success — landing page after the artist completes payment.
 *
 * Two states to handle:
 *   1. Webhook already arrived (track.status === 'active'): show the
 *      celebratory "you're charted" view with a direct link to the
 *      artist's track page.
 *   2. Webhook hasn't arrived yet (still 'pending_payment'): show a
 *      "we're confirming your payment, this takes 1-2 minutes" view
 *      with a meta-refresh tag so the page reloads after 8 seconds.
 *
 * If the webhook never arrives (a known risk with Vivid — their dashboard
 * does not expose webhook delivery history), the artist can simply email
 * us; the admin will then mark the track as paid via the new admin
 * action button.
 */
export default async function AddSongSuccessPage({ searchParams }: PageProps) {
  const { track: trackId } = await searchParams;

  // No id in URL = generic celebration page (the artist may have closed
  // and reopened the tab); we cannot say much without context.
  if (!trackId) {
    return <GenericReceivedView />;
  }

  const sb = createServerClient();
  const { data: track } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, status')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return <GenericReceivedView />;
  }

  if (track.status === 'active') {
    const genreName = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
    return (
      <ActivatedView
        artistName={track.artist_name}
        songTitle={track.song_title}
        genreName={genreName}
        trackUrl={`/track/${track.id}`}
      />
    );
  }

  // status === 'pending_payment' (or anything else) — show the waiting view
  return <PendingView trackId={track.id} songTitle={track.song_title} />;
}

// ----------------------------------------------------------------------

function ActivatedView({
  artistName,
  songTitle,
  genreName,
  trackUrl,
}: {
  artistName: string;
  songTitle: string;
  genreName: string;
  trackUrl: string;
}) {
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-6" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          You're on the chart.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-3">
          <strong className="text-white">"{songTitle}"</strong> by{' '}
          <strong className="text-white">{artistName}</strong> is now live on the{' '}
          <strong className="text-white">{genreName}</strong> chart.
        </p>
        <p className="text-ink-300 text-sm mb-8">
          A confirmation email and your receipt are on their way.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href={trackUrl}
            className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3"
          >
            View your chart page
          </Link>
          <Link
            href="/charts/all"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3"
          >
            All charts
          </Link>
        </div>
      </div>
    </section>
  );
}

function PendingView({ trackId, songTitle }: { trackId: string; songTitle: string }) {
  return (
    <section className="min-h-[60vh] flex items-center">
      {/* Auto-reload every 8s — when the webhook lands, the next refresh
          will pick up status=active and switch to the celebratory view. */}
      <meta httpEquiv="refresh" content="8" />
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <Clock className="mx-auto text-amber-300 mb-6 animate-pulse" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          Payment received.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-3">
          Thanks! We are confirming the payment for{' '}
          <strong className="text-white">"{songTitle}"</strong>. This page will refresh
          automatically — it usually takes 30 seconds to 2 minutes.
        </p>
        <p className="text-ink-300 text-sm mb-8">
          You will receive a confirmation email as soon as the chart entry is live.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href={`/recover/${trackId}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3 text-sm"
          >
            Refresh now
          </Link>
        </div>
        <p className="text-ink-500 text-xs mt-8 max-w-md mx-auto leading-relaxed">
          Still pending after 5 minutes? Reply to the receipt email or write to{' '}
          <a href="mailto:contact@worldwidemusicstar.com" className="text-brand hover:underline">
            contact@worldwidemusicstar.com
          </a>{' '}
          and we will activate your entry within a few hours.
        </p>
      </div>
    </section>
  );
}

function GenericReceivedView() {
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-6" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          Payment received.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-8">
          Thanks! Your chart entry is being processed. You will receive a confirmation email
          within a few minutes once the payment is fully confirmed.
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
