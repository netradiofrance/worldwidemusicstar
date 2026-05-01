import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

/**
 * /unsubscribe — landing page that List-Unsubscribe header points to.
 *
 * On GET: shows a confirmation screen.
 * Marking an email as unsubscribed is handled by a small POST API route
 * (see /api/unsubscribe) so we can also satisfy Gmail's RFC 8058
 * one-click requirement, which wants a POST endpoint that succeeds
 * without user interaction.
 *
 * Implementation note: we maintain the unsubscribe state by setting
 * `unsubscribed_at` on every track owned by that email. The cron and
 * webhook senders skip emails where any track has unsubscribed_at set.
 */
export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { email } = await searchParams;
  const decoded = email ? decodeURIComponent(email) : '';

  // Best-effort sanity check (we do not block — just a soft display)
  let knownEmail = false;
  if (decoded) {
    const sb = createServerClient();
    const { data } = await sb
      .from('tracks')
      .select('id')
      .eq('email', decoded)
      .limit(1)
      .maybeSingle();
    knownEmail = !!data;
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#111', borderRadius: 16, padding: '40px 32px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ fontFamily: 'Anton, Impact, sans-serif', fontSize: 32, lineHeight: 1.05, margin: '0 0 16px', color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          Unsubscribe
        </h1>

        {decoded && knownEmail ? (
          <UnsubscribeForm email={decoded} />
        ) : decoded ? (
          <p style={{ color: '#C9C9C9', fontSize: 15, lineHeight: 1.6 }}>
            We could not find <strong style={{ color: '#fff' }}>{decoded}</strong> in our records. You are not on our mailing list.
          </p>
        ) : (
          <p style={{ color: '#C9C9C9', fontSize: 15, lineHeight: 1.6 }}>
            No email address provided. To unsubscribe, click the unsubscribe link from any email you received from us.
          </p>
        )}

        <p style={{ color: '#5A5A5A', fontSize: 12, lineHeight: 1.6, marginTop: 24 }}>
          For any other request, write to{' '}
          <a href="mailto:contact@worldwidemusicstar.com" style={{ color: '#D62828' }}>
            contact@worldwidemusicstar.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function UnsubscribeForm({ email }: { email: string }) {
  return (
    <>
      <p style={{ color: '#C9C9C9', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
        Click the button below to stop receiving emails about your registration on{' '}
        <strong style={{ color: '#fff' }}>{email}</strong>.
      </p>
      {/* Plain HTML form — no JS needed. POSTs to our unsubscribe API. */}
      <form action="/api/unsubscribe" method="POST">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          style={{
            display: 'inline-block',
            background: '#D62828',
            color: '#fff',
            padding: '14px 28px',
            border: 'none',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Confirm unsubscribe
        </button>
      </form>
    </>
  );
}
