'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Article } from '@/lib/database.types';

export function ArticleListActions({ article }: { article: Article }) {
  const router = useRouter();

  async function publish() {
    const res = await fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }),
    });
    if (res.ok) router.refresh();
  }
  async function unpublish() {
    const res = await fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    if (res.ok) router.refresh();
  }
  async function del() {
    if (!confirm('Delete this article?')) return;
    const res = await fetch(`/api/admin/articles/${article.id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  return (
    <div className="inline-flex gap-3 text-xs">
      <Link href={`/admin/articles/${article.id}`} className="text-brand hover:underline font-semibold">Edit</Link>
      {article.status === 'draft' ? (
        <button onClick={publish} className="text-emerald-400 hover:underline font-semibold">Publish</button>
      ) : (
        <button onClick={unpublish} className="text-amber-300 hover:underline font-semibold">Unpublish</button>
      )}
      <button onClick={del} className="text-red-300 hover:underline font-semibold">Delete</button>
    </div>
  );
}
