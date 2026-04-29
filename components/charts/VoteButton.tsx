'use client';

import { useState } from 'react';
import { Vote, Clock, AlertCircle } from 'lucide-react';
import { VoteAdModal } from './VoteAdModal';

interface Props {
  trackId: string;
  compact?: boolean;
}

export function VoteButton({ trackId, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [busy, setBusy] = useState(false);
  // Rate-limit / generic error messaging — replaces alert() with an inline
  // tooltip that auto-dismisses after a few seconds.
  const [notice, setNotice] = useState<{ type: 'rateLimit'|'error'; msg: string } | null>(null);

  function showNotice(type: 'rateLimit'|'error', msg: string) {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 5000);
  }

  function handleClick() {
    if (hasVoted || busy) return;
    setOpen(true);
  }

  async function handleAdCompleted(adSessionId: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/votes/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, adSessionId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setHasVoted(true);
      } else if (res.status === 429) {
        showNotice('rateLimit', j.error ?? 'You can only vote once per hour for this track.');
      } else {
        showNotice('error', j.error ?? 'Could not register your vote.');
      }
    } catch {
      showNotice('error', 'Network error.');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        disabled={hasVoted || busy}
        className={[
          'inline-flex items-center gap-2 rounded-full font-semibold transition-colors',
          compact ? 'text-xs px-3 py-1.5' : 'text-sm px-5 py-2.5',
          hasVoted
            ? 'bg-emerald-600/20 text-emerald-400 cursor-default'
            : busy
              ? 'bg-ink-600 text-ink-300 cursor-wait'
              : 'bg-brand hover:bg-brand-dark text-white',
        ].join(' ')}
      >
        <Vote size={compact ? 14 : 16} />
        {hasVoted ? 'Voted' : busy ? 'Saving…' : 'Vote'}
      </button>

      {open && (
        <VoteAdModal onClose={() => setOpen(false)} onCompleted={handleAdCompleted} />
      )}

      {notice && (
        <div className={[
          'absolute z-30 right-0 top-full mt-2 w-64 rounded-md px-3 py-2.5 text-xs flex items-start gap-2 border shadow-xl',
          notice.type === 'rateLimit'
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-100'
            : 'bg-red-500/15 border-red-500/40 text-red-100',
        ].join(' ')}>
          {notice.type === 'rateLimit'
            ? <Clock size={14} className="shrink-0 mt-0.5" />
            : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
          <div className="flex-1 leading-snug">{notice.msg}</div>
        </div>
      )}
    </div>
  );
}
