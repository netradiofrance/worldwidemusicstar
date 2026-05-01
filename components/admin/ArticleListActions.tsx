'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import type { Article } from '@/lib/database.types';

/**
 * Action icons for a single row in the admin /admin/articles list.
 * Mirrors the visual language of TrackListActions for consistency.
 */
export function ArticleListActions({ article }: { article: Article }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'publish' | 'delete' | null>(null);

  async function publish() {
    setBusy('publish');
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: article.status === 'published' ? 'draft' : 'published',
          published_at: article.status === 'published' ? null : new Date().toISOString(),
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function del() {
    if (!confirm('Delete this article?')) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const isPublished = article.status === 'published';

  return (
    <div className="inline-flex items-center gap-1 justify-end">
      {/* Edit — pencil */}
      <Link
        href={`/admin/articles/${article.id}`}
        className="p-2 rounded-md text-ink-200 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Edit"
        title="Edit"
      >
        <Pencil size={15} />
      </Link>

      {/* Publish / Unpublish toggle — eye icon */}
      <button
        type="button"
        onClick={publish}
        disabled={busy !== null}
        className={[
          'p-2 rounded-md transition-colors disabled:opacity-50',
          isPublished
            ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
            : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300',
        ].join(' ')}
        aria-label={isPublished ? 'Unpublish' : 'Publish'}
        title={isPublished ? 'Unpublish' : 'Publish'}
      >
        {busy === 'publish'
          ? <Loader2 size={15} className="animate-spin" />
          : isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>

      {/* Delete — trash */}
      <button
        type="button"
        onClick={del}
        disabled={busy !== null}
        className="p-2 rounded-md text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors disabled:opacity-50"
        aria-label="Delete"
        title="Delete"
      >
        {busy === 'delete' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      </button>
    </div>
  );
}
