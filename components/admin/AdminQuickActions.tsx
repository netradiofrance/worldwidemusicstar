'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Loader2, RefreshCw, Sparkles, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActionDef {
  action: 'refresh-counters' | 'monthly-archive' | 'generate-article';
  label: string;
  icon: React.ReactNode;
}

const ACTIONS: ActionDef[] = [
  { action: 'generate-article',  label: 'Generate a new article (AI draft)',         icon: <Sparkles size={14} /> },
  { action: 'refresh-counters',  label: 'Refresh Spotify + YouTube counters now',     icon: <RefreshCw size={14} /> },
  { action: 'monthly-archive',   label: 'Force monthly archive snapshot',             icon: <Trophy size={14} /> },
];

export function AdminQuickActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  async function run(action: ActionDef['action']) {
    setBusy(action);
    setToast(null);
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setToast({
          type: 'error',
          msg: `Failed: ${data?.data?.error ?? data?.error ?? 'unknown error'}`,
        });
      } else {
        // Build a friendly message from the result
        let msg = 'Done.';
        if (action === 'refresh-counters') {
          const sp = data?.data?.spotify;
          const yt = data?.data?.youtube;
          msg = `Refresh complete — Spotify: ${sp?.updated ?? 0} updated, ${sp?.skipped ?? 0} skipped. YouTube: ${yt?.updated ?? 0} updated, ${yt?.resolved ?? 0} resolved, ${yt?.skipped ?? 0} skipped.`;
        } else if (action === 'generate-article') {
          msg = `Article generated as draft. Slug: ${data?.data?.article?.slug ?? '(check Articles tab)'}`;
        } else if (action === 'monthly-archive') {
          msg = `Archive snapshot created for period ${data?.data?.period ?? ''}.`;
        }
        setToast({ type: 'success', msg });
        router.refresh();
      }
    } catch (e: any) {
      setToast({ type: 'error', msg: e?.message ?? 'Network error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl bg-ink-900 border border-white/5 p-6">
      <h2 className="font-display uppercase text-xl mb-4">Quick actions</h2>
      <div className="grid grid-cols-1 gap-2">
        <a
          href="/admin/artists/new"
          className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 text-sm"
        >
          <span className="flex items-center gap-2"><Sparkles size={14} /> Add a track without payment</span>
          <ArrowUpRight size={14} className="text-ink-400" />
        </a>
        {ACTIONS.map(a => (
          <button
            key={a.action}
            type="button"
            onClick={() => run(a.action)}
            disabled={busy !== null}
            className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 text-sm disabled:opacity-50 text-left"
          >
            <span className="flex items-center gap-2">{a.icon}{a.label}</span>
            {busy === a.action ? (
              <Loader2 size={14} className="animate-spin text-ink-300" />
            ) : (
              <span className="text-brand text-xs font-semibold">Run →</span>
            )}
          </button>
        ))}
      </div>

      {toast && (
        <div className={[
          'mt-4 rounded-md px-3 py-3 text-sm flex items-start gap-2 border',
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            : 'bg-red-500/10 border-red-500/30 text-red-200',
        ].join(' ')}>
          {toast.type === 'success'
            ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
          <div className="flex-1">{toast.msg}</div>
          <button onClick={() => setToast(null)} className="text-xs text-ink-400 hover:text-white">×</button>
        </div>
      )}
    </div>
  );
}
