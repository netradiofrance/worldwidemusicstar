'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Mail, CheckCircle2, Loader2, Check, X as XIcon } from 'lucide-react';
import type { Track } from '@/lib/database.types';

/**
 * Action buttons for a single row in the admin /admin/artists list.
 *
 * Pending payment rows get THREE icons:
 *   - ✅ green "Mark as paid"  — manual activation if Vivid webhook missed
 *   - ✉️ amber "Send recovery" — fire a reminder email
 *   - ✏️ "Edit"
 *
 * Active / archived rows get only the edit pencil.
 *
 * Inline mini-toasts for feedback — no full-page navigation, the row
 * stays where it is and the admin can keep working.
 */
export function TrackListActions({ track }: { track: Track }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'recovery' | 'paid' | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function sendRecovery() {
    setBusy('recovery');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/send-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error ?? 'Send failed' });
      } else {
        setFeedback({ ok: true, msg: `Email sent (#${data.attemptNumber})` });
      }
    } catch (e: any) {
      setFeedback({ ok: false, msg: e?.message ?? 'Network error' });
    } finally {
      setBusy(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  async function markAsPaid() {
    const ok = confirm(
      `Mark "${track.song_title}" by ${track.artist_name} as paid?\n\n` +
      `This activates the track and sends confirmation + receipt emails. ` +
      `Use this only if the payment is confirmed in your Vivid dashboard ` +
      `but the track is still pending here.`,
    );
    if (!ok) return;

    setBusy('paid');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/mark-as-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error ?? 'Activation failed' });
      } else {
        setFeedback({ ok: true, msg: data.message ?? 'Activated' });
        // Refresh the list so the row's status badge updates from "pending_payment" to "active"
        setTimeout(() => router.refresh(), 600);
      }
    } catch (e: any) {
      setFeedback({ ok: false, msg: e?.message ?? 'Network error' });
    } finally {
      setBusy(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  return (
    <div className="inline-flex items-center gap-1 justify-end relative">
      {/* Mark as paid — emerald check, only for pending_payment tracks */}
      {track.status === 'pending_payment' && (
        <button
          type="button"
          onClick={markAsPaid}
          disabled={busy !== null}
          className="p-2 rounded-md text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors disabled:opacity-50"
          aria-label="Mark as paid"
          title="Mark as paid (manual fallback)"
        >
          {busy === 'paid' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        </button>
      )}

      {/* Send recovery email — only for pending_payment tracks */}
      {track.status === 'pending_payment' && (
        <button
          type="button"
          onClick={sendRecovery}
          disabled={busy !== null}
          className="p-2 rounded-md text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors disabled:opacity-50"
          aria-label="Send recovery email"
          title="Send recovery email"
        >
          {busy === 'recovery' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
        </button>
      )}

      {/* Edit — pencil icon */}
      <Link
        href={`/admin/artists/${track.id}`}
        className="p-2 rounded-md text-ink-200 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Edit"
        title="Edit"
      >
        <Pencil size={15} />
      </Link>

      {/* Floating feedback toast — auto-dismisses after 4s */}
      {feedback && (
        <div
          className={[
            'absolute right-0 top-full mt-1 z-30 rounded-md px-3 py-2 text-xs flex items-center gap-1.5 border shadow-xl whitespace-nowrap',
            feedback.ok
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
              : 'bg-red-500/15 border-red-500/40 text-red-100',
          ].join(' ')}
          role="status"
        >
          {feedback.ok ? <Check size={12} /> : <XIcon size={12} />}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
