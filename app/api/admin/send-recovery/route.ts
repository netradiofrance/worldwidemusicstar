import { NextResponse } from 'next/server';
import { getAdminFromCookie } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { sendEmail, paymentReminderEmail } from '@/lib/email';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin "Send recovery email" — fires a payment reminder for one specific
 * pending track on demand, bypassing the daily cron schedule.
 *
 * Respects unsubscribe — if the user has opted out (unsubscribed_at set
 * on any of their tracks), this returns a 403 with a clear message.
 *
 * The cron's pacing logic (count, sent_at) still gets updated so that the
 * automatic schedule continues correctly afterwards: this manual send
 * counts as one of the up-to-8 reminders the artist will receive.
 */
export async function POST(req: Request) {
  const session = await getAdminFromCookie();
  if (!session) return new NextResponse('unauthorized', { status: 401 });

  let body: { trackId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const trackId = body.trackId?.trim();
  if (!trackId) return NextResponse.json({ error: 'trackId required' }, { status: 400 });

  const sb = createServerClient();
  const { data: track, error } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, email, status, payment_reminder_count, unsubscribed_at')
    .eq('id', trackId)
    .maybeSingle();

  if (error || !track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }
  if (track.status !== 'pending_payment') {
    return NextResponse.json(
      { error: `Track status is "${track.status}" — recovery email is only for pending payments.` },
      { status: 400 },
    );
  }

  // Respect unsubscribe — also check across all tracks for this email
  if (track.unsubscribed_at) {
    return NextResponse.json(
      { error: 'This artist has unsubscribed and cannot be emailed.' },
      { status: 403 },
    );
  }
  const { data: optOuts } = await sb
    .from('tracks')
    .select('id')
    .eq('email', track.email)
    .not('unsubscribed_at', 'is', null)
    .limit(1);
  if (optOuts && optOuts.length > 0) {
    return NextResponse.json(
      { error: 'This email address has unsubscribed and cannot be contacted.' },
      { status: 403 },
    );
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '');
  const recoverUrl = `${site}/recover/${track.id}`;
  const genreName = GENRE_BY_SLUG[track.genre]?.name ?? track.genre;
  const attemptNumber = (track.payment_reminder_count ?? 0) + 1;

  try {
    const tpl = paymentReminderEmail({
      artistName: track.artist_name,
      songTitle: track.song_title,
      genreName,
      recoverUrl,
      attemptNumber,
    });
    await sendEmail({ to: track.email, ...tpl });

    await sb.from('tracks').update({
      payment_reminder_sent_at: new Date().toISOString(),
      payment_reminder_count: attemptNumber,
    }).eq('id', track.id);

    return NextResponse.json({ ok: true, attemptNumber, sentTo: track.email });
  } catch (e: any) {
    console.error('[admin/send-recovery] failed:', e);
    return NextResponse.json({ error: e?.message ?? 'Send failed' }, { status: 500 });
  }
}
