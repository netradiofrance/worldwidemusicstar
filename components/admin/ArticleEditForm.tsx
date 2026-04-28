'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PUBLIC_GENRES } from '@/lib/genres';
import type { Article } from '@/lib/database.types';

export function ArticleEditForm({ article }: { article: Article }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: article.title,
    excerpt: article.excerpt ?? '',
    content_md: article.content_md,
    cover_url: article.cover_url ?? '',
    related_genre: article.related_genre ?? '',
    status: article.status,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const payload: any = { ...form, related_genre: form.related_genre || null };
    if (form.status === 'published' && !article.published_at) {
      payload.published_at = new Date().toISOString();
    }
    const res = await fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) { setMsg('Saved.'); router.refresh(); }
    else { const j = await res.json().catch(()=>({})); setMsg(j.error ?? 'Save failed'); }
  }

  async function regenerateCover() {
    setRegenerating(true);
    const res = await fetch(`/api/admin/articles/${article.id}/regenerate-cover`, { method: 'POST' });
    setRegenerating(false);
    if (res.ok) { router.refresh(); }
    else { const j = await res.json().catch(()=>({})); alert(j.error ?? 'Could not regenerate'); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
        <div className="space-y-2">
          {form.cover_url ? (
            <Image src={form.cover_url} alt="" width={200} height={120} className="rounded-lg w-full object-cover aspect-video" />
          ) : (
            <div className="rounded-lg bg-ink-800 aspect-video" />
          )}
          <button type="button" onClick={regenerateCover} disabled={regenerating} className="w-full text-xs rounded-md bg-ink-800 hover:bg-ink-700 px-3 py-2">
            {regenerating ? 'Generating…' : 'Regenerate cover'}
          </button>
        </div>
        <div className="space-y-3">
          <input className="input" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} placeholder="Title" required />
          <input className="input" value={form.excerpt} onChange={e => setForm(s => ({ ...s, excerpt: e.target.value }))} placeholder="Excerpt" />
          <input className="input" value={form.cover_url} onChange={e => setForm(s => ({ ...s, cover_url: e.target.value }))} placeholder="Cover URL" />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.related_genre} onChange={e => setForm(s => ({ ...s, related_genre: e.target.value as any }))}>
              <option value="">No related genre</option>
              {PUBLIC_GENRES.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
            </select>
            <select className="input" value={form.status} onChange={e => setForm(s => ({ ...s, status: e.target.value as any }))}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Markdown content</label>
        <textarea
          rows={20}
          className="input font-mono text-sm leading-relaxed"
          value={form.content_md}
          onChange={e => setForm(s => ({ ...s, content_md: e.target.value }))}
          required
        />
      </div>

      {msg && <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm">{msg}</div>}

      <div className="flex justify-end pt-4 border-t border-white/5">
        <button type="submit" disabled={busy} className="rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2.5 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: #1A1A1A;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fff;
        }
      `}</style>
    </form>
  );
}
