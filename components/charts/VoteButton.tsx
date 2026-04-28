'use client';

import { useState } from 'react';
import { Vote } from 'lucide-react';
import { VoteAdModal } from './VoteAdModal';

interface Props {
  trackId: string;
  compact?: boolean;
}

export function VoteButton({ trackId, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [busy, setBusy] = useState(false);

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
      if (res.ok) {
        setHasVoted(true);
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? 'Could not register your vote. Please try again.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
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
        <VoteAdModal
          onClose={() => setOpen(false)}
          onCompleted={handleAdCompleted}
        />
      )}
    </>
  );
}
