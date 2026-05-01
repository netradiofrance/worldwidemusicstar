import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { createVividPaymentLink } from '@/lib/vivid';
import { GENRE_BY_SLUG } from '@/lib/genres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps { params: Promise<{ trackId: string }> }

/**
 * /recover/<trackId> — landing page artists hit when they click the
 * "complete your registration" button in the reminder email.
 *
 * The flow:
 *   1. Look up the track. If active, it's already paid — show a friendly
 *      "you're already charted" message.
 *   2. If still pending_payment, create a fresh Vivid payment link
 *      (the original link from the initial flow has expired) and
 *      redirect the user there.
 *   3. If anything fails, render an error state with a manual retry link
 *      back to /add-a-song.
 *
 * This page intentionally has no client-side JS — the redirect happens
 * server-side and feels instant.
 */
export default async function RecoverPage({ params }: PageProps) {
  const { trackId } = await params;
  if (!trackId) notFound();

  const sb = createServerClient();
  const { data: track } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, email, status')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return (
      <RecoveryShell heading="Registration not found">
        <p style={{ color: '#C9C9C9', marginBottom: 24 }}>
          We could not find the registration linked to this email. It may have been removed.
        </p>
        <Link
          href="/add-a-song"
          style={{
            display: 'inline-block',
            background: '#D62828',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Start a new registration
        </Link>
      </RecoveryShell>
    );
  }

  if (track.status === 'active') {
    redirect(`/track/${track.id}`);
  }

  if (track.status !== 'pending_payment') {
    return (
      <RecoveryShell heading="This registration cannot be completed">
        <p style={{ color: '#C9C9C9' }}>
          This entry is in status <strong>{track.status}</strong> and cannot be reopened.
          Please contact support if you need help.
        </p>
      </RecoveryShell>
    );
  }

  // Re-create a fresh payment link — the original from the reminder email
  // would have expired on Vivid's side after a few hours.
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '');
  const price = Number(process.env.NEXT_PUBLIC_ENTRY_PRICE_EUR ?? '99.99');

  try {
    const { url } = await createVividPaymentLink({
      amount: price,
      currencyCode: 'EUR',
      externalOrderId: track.id,
      description: `WorldWide Music Star — Chart entry: "${track.song_title}" by ${track.artist_name}`,
      redirectUrl: `${site}/add-a-song/success?track=${track.id}`,
      webhookUrl: `${site}/api/payment/vivid/webhook`,
      language: 'en',
    });
    redirect(url);
  } catch (e: any) {
    // Don't redirect-throw inside try block — Next handles the redirect by throwing,
    // so we catch only NON-redirect errors here.
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e;
    console.error('[recover] Vivid link error:', e);
    const genre = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
    return (
      <RecoveryShell heading="We hit a snag">
        <p style={{ color: '#C9C9C9', marginBottom: 16 }}>
          We could not generate a fresh payment link for{' '}
          <strong style={{ color: '#fff' }}>"{track.song_title}"</strong> ({genre}).
        </p>
        <p style={{ color: '#9A9A9A', fontSize: 13 }}>
          Please try again in a few minutes, or contact us if it persists.
        </p>
      </RecoveryShell>
    );
  }
}

function RecoveryShell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#111', borderRadius: 16, padding: '40px 32px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ fontFamily: 'Anton, Impact, sans-serif', fontSize: 32, lineHeight: 1.05, margin: '0 0 16px', color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          {heading}
        </h1>
        {children}
      </div>
    </div>
  );
}
