import { createServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Mail, Eye } from 'lucide-react';
import { GENRE_BY_SLUG } from '@/lib/genres';
import { formatNumber } from '@/lib/scoring';
import { TrackListActions } from '@/components/admin/TrackListActions';

export const dynamic = 'force-dynamic';

export default async function AdminArtistsPage() {
  const sb = createServerClient();

  // Pull tracks
  const { data: tracks } = await sb
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  // Pull all email open events for pending tracks in one go (avoids N+1).
  // We map them by track_id -> [event row] so each row can show whether
  // the most recent reminder has been opened.
  const pendingIds = (tracks ?? [])
    .filter(t => t.status === 'pending_payment')
    .map(t => t.id);

  const opensByTrack = new Map<string, { attempt: number | null; occurred_at: string }[]>();
  if (pendingIds.length > 0) {
    const { data: events } = await sb
      .from('email_events')
      .select('track_id, attempt, occurred_at')
      .eq('event_type', 'open')
      .eq('email_type', 'payment_reminder')
      .in('track_id', pendingIds)
      .order('occurred_at', { ascending: false });
    for (const e of events ?? []) {
      if (!e.track_id) continue;
      const arr = opensByTrack.get(e.track_id) ?? [];
      arr.push({ attempt: e.attempt, occurred_at: e.occurred_at });
      opensByTrack.set(e.track_id, arr);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display uppercase text-4xl tracking-tightest mb-1">Artists & Tracks</h1>
          <p className="text-ink-300">Manage every entry in the database.</p>
        </div>
        <Link
          href="/admin/artists/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-5 py-2.5 text-sm"
        >
          <Plus size={15} /> Add manual entry
        </Link>
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-300">
            <tr>
              <th className="text-left px-4 py-3">Artist</th>
              <th className="text-left px-4 py-3">Song</th>
              <th className="text-left px-4 py-3">Genre</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Votes</th>
              <th className="text-right px-4 py-3">Score</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tracks ?? []).map(t => {
              const isPending = t.status === 'pending_payment';
              const lastReminderAt = t.payment_reminder_sent_at;
              const reminderCount = t.payment_reminder_count ?? 0;
              const opens = opensByTrack.get(t.id) ?? [];
              // The "latest" attempt is the highest # we've sent; opened if any event
              // exists for that attempt (or any attempt — see ReminderInfo).
              const latestAttemptOpened = opens.some(o => o.attempt === reminderCount);

              return (
                <tr key={t.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-3 text-white">{t.artist_name}</td>
                  <td className="px-4 py-3 text-ink-200">{t.song_title}</td>
                  <td className="px-4 py-3 text-ink-300">{GENRE_BY_SLUG[t.genre]?.name}</td>
                  <td className="px-4 py-3">
                    <span className={[
                      'text-[10px] uppercase tracking-wider rounded-full px-2 py-1 font-semibold',
                      t.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' :
                      isPending ? 'bg-amber-500/15 text-amber-300' :
                      t.status === 'archived' ? 'bg-ink-700 text-ink-300' :
                      'bg-red-500/15 text-red-300',
                    ].join(' ')}>{t.status}</span>
                    {isPending && lastReminderAt && (
                      <ReminderInfo
                        sentAt={lastReminderAt}
                        attemptNumber={reminderCount}
                        opened={latestAttemptOpened}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-200">{formatNumber(t.votes_count)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-200">{formatNumber(Math.round(t.score))}</td>
                  <td className="px-4 py-3 text-right">
                    <TrackListActions track={t} />
                  </td>
                </tr>
              );
            })}
            {(!tracks || tracks.length === 0) && (
              <tr><td colSpan={7} className="text-center text-ink-400 py-10">No tracks yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Compact "Last reminder: 2 May, 14:32 (#3) Opened" line shown under the
 * status badge for pending_payment rows that have already received at
 * least one reminder.
 */
function ReminderInfo({
  sentAt,
  attemptNumber,
  opened,
}: {
  sentAt: string;
  attemptNumber: number;
  opened: boolean;
}) {
  const formatted = formatShortDate(sentAt);
  return (
    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-400">
      <Mail size={10} className="shrink-0" />
      <span>Last reminder: {formatted} (#{attemptNumber})</span>
      {opened && (
        <span className="inline-flex items-center gap-0.5 text-emerald-400" title="Email opened">
          <Eye size={10} />
          Opened
        </span>
      )}
    </div>
  );
}

/**
 * Format an ISO timestamp as "2 May, 14:32" (the user's chosen short format).
 * Always rendered in UTC for consistency across admin sessions.
 */
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hh}:${mm}`;
}
