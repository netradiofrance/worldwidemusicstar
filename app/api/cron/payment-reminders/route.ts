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
 * Sends reminders to artists who started a registration but never completed
 * payment. Schedule: 30 min after creation, then once a day for the next
 * 7 days. After 7 days the track is auto-archived.
 *
 * To pace correctly, we record each send in `tracks.payment_reminder_sent_at`
 * and `tracks.payment_reminder_count`. The cron picks every track whose
 * "next reminder due time" is in the past.
 *
 * On Vercel Hobby this cron is wired to run once per day. That gives the
 * artist 7 daily nudges after the initial 30-min one (which is sent
 * naturally on the next cron tick — so we accept the 30-min granularity
 * is in fact "next cron run", which on Hobby is 1/day).
 *
 * If Hobby's 1-cron-per-day limit is too coarse, the user can wire an
 * external cron service (cron-job.org, EasyCron, etc.) to ping this
 * endpoint every 15-30 minutes — the auth via x-cron-secret still
 * works for those.
 */
export async function POST(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}
export async function GET(req: Request) {
  if (!(await authorizeCron(req))) return new NextResponse('unauthorized', { status: 401 });
  return run();
}

const FIRST_REMINDER_AFTER_MS = 30 * 60 * 1000;          // 30 min after creation
const DAILY_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;  // every 24h after that
const MAX_REMINDERS = 8;                                  // 1 quick + 7 daily

async function run() {
  const sb = createServerClient();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '');

  // 1. Pick all pending tracks
  const { data: tracks, error } = await sb
    .from('tracks')
    .select('id, artist_name, song_title, genre, email, status, created_at, payment_reminder_sent_at, payment_reminder_count')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0, archived = 0, skipped = 0;
  const now = Date.now();

  for (const t of tracks ?? []) {
    const created = new Date(t.created_at).getTime();
    const lastSent = t.payment_reminder_sent_at ? new Date(t.payment_reminder_sent_at).getTime() : null;
    const count = t.payment_reminder_count ?? 0;

    // Reached max reminders -> archive the abandoned track
    if (count >= MAX_REMINDERS) {
      await sb.from('tracks').update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      }).eq('id', t.id);
      archived++;
      continue;
    }

    // Decide whether this track is due for a reminder
    let due = false;
    if (count === 0) {
      // First reminder: 30 min after creation
      due = (now - created) >= FIRST_REMINDER_AFTER_MS;
    } else if (lastSent !== null) {
      // Subsequent reminders: every 24h after the last send
      due = (now - lastSent) >= DAILY_REMINDER_INTERVAL_MS;
    }

    if (!due) { skipped++; continue; }

    try {
      const genreName = GENRE_BY_SLUG[t.genre]?.name ?? t.genre;
      const recoverUrl = `${site}/recover/${t.id}`;
      const tpl = paymentReminderEmail({
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
    totalPending: tracks?.length ?? 0,
  });
}
