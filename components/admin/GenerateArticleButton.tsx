'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Generate article button for the admin /admin/articles page.
 *
 * Calls /api/admin/actions instead of /api/blog/generate directly. The
 * actions endpoint already handles auth + the cron-secret bridge, so we
 * stay inside the admin UI and surface a friendly toast.
 */
export function GenerateArticleButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  async function generate() {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-article' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setToast({
          type: 'error',
          msg: `Generation failed: ${data?.data?.error ?? data?.error ?? 'unknown error'}`,
        });
      } else {
        const slug = data?.data?.article?.slug ?? '';
        setToast({
          type: 'success',
          msg: slug
            ? `Article generated as draft. Slug: ${slug}`
            : 'Article generated as draft. Refresh to see it.',
        });
        router.refresh();
      }
    } catch (e: any) {
      setToast({ type: 'error', msg: e?.message ?? 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-60 disabled:cursor-wait"
      >
        {busy
          ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
          : <><Sparkles size={14} /> Generate new draft</>}
      </button>

      {toast && (
        <div className={[
          'absolute right-0 top-full mt-3 w-80 z-30 rounded-md px-3 py-3 text-sm flex items-start gap-2 border shadow-xl',
          toast.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
            : 'bg-red-500/15 border-red-500/40 text-red-100',
        ].join(' ')}>
          {toast.type === 'success'
            ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
          <div className="flex-1">{toast.msg}</div>
          <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  );
}
