'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Mail, Loader2, Check, X as XIcon } from 'lucide-react';
import type { Track } from '@/lib/database.types';

/**
 * Action buttons for a single row in the admin /admin/artists list.
 *
 * Renders a pencil icon (edit) for every row, plus a mail icon
 * (send-recovery) only when the track is in pending_payment state.
 *
 * Inline mini-toasts for feedback — no full-page navigation, the row
 * stays where it is and the admin can keep working.
 */
export function TrackListActions({ track }: { track: Track }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function sendRecovery() {
    setBusy(true);
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
      setBusy(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  return (
    <div className="inline-flex items-center gap-1 justify-end relative">
      {/* Send recovery email — only for pending_payment tracks */}
      {track.status === 'pending_payment' && (
        <button
          type="button"
          onClick={sendRecovery}
          disabled={busy}
          className="p-2 rounded-md text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors disabled:opacity-50"
          aria-label="Send recovery email"
          title="Send recovery email"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
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
