import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase';
import { sendEmail, paymentReminderEmail } from '@/lib/email';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Payment reminder cron.
 *
 * Sends reminders to artists who started a registration but never
 * completed payment. Schedule: 30 min after creation, then once a day
 * for the next 7 days. After 8 reminders the track is auto-archived.
 *
 * Skips tracks where unsubscribed_at is set (List-Unsubscribe respected).
 *
 * Each reminder email carries a 1x1 tracking pixel so we can estimate
 * open rates over time (computed in the helper, requires await).
 */
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}

const FIRST_REMINDER_AFTER_MS = 30 * 60 * 1000;
const DAILY_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_REMINDERS = 8;

async function run() {
  const sb = createServerClient();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '');

  const { data: tracks, error } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, email, status, created_at, payment_reminder_sent_at, payment_reminder_count, unsubscribed_at')
    .eq('status', 'pending_payment')
    .is('unsubscribed_at', null)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0, archived = 0, skipped = 0, unsubscribedSkipped = 0;
  const now = Date.now();

  // Build a Set of unsubscribed emails for cross-track opt-out
  const { data: optOuts } = await sb
    .from('tracks')
    .select('email')
    .not('unsubscribed_at', 'is', null);
  const unsubscribedEmails = new Set((optOuts ?? []).map(r => r.email.toLowerCase()));

  for (const t of tracks ?? []) {
    if (unsubscribedEmails.has(t.email.toLowerCase())) {
      unsubscribedSkipped++;
      continue;
    }

    const created = new Date(t.created_at).getTime();
    const lastSent = t.payment_reminder_sent_at ? new Date(t.payment_reminder_sent_at).getTime() : null;
    const count = t.payment_reminder_count ?? 0;

    if (count >= MAX_REMINDERS) {
      await sb.from('tracks').update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      }).eq('id', t.id);
      archived++;
      continue;
    }

    let due = false;
    if (count === 0) {
      due = (now - created) >= FIRST_REMINDER_AFTER_MS;
    } else if (lastSent !== null) {
      due = (now - lastSent) >= DAILY_REMINDER_INTERVAL_MS;
    }

    if (!due) { skipped++; continue; }

    try {
      const genreName = GENRE_BY_SLUG[t.genre]?.name ?? t.genre;
      const recoverUrl = `${site}/recover/${t.id}`;
      const tpl = await paymentReminderEmail({
        trackId: t.id,
        artistName: t.artist_name,
        songTitle: t.song_title,
        genreName,
        recoverUrl,
        attemptNumber: count + 1,
      });
      await sendEmail({ to: t.email, ...tpl });

      await sb.from('tracks').update({
        payment_reminder_sent_at: new Date().toISOString(),
        payment_reminder_count: count + 1,
      }).eq('id', t.id);

      sent++;
    } catch (e) {
      console.error('[cron/payment-reminders] failed for track', t.id, e);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    archived,
    skipped,
    unsubscribedSkipped,
    totalPending: tracks?.length ?? 0,
  });
}
