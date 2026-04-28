import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { ArticleEditForm } from '@/components/admin/ArticleEditForm';

export const dynamic = 'force-dynamic';

export default async function AdminArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createServerClient();
  const { data: article } = await sb.from('articles').select('*').eq('id', id).maybeSingle();
  if (!article) notFound();
  return (
    <div className="max-w-4xl">
      <h1 className="font-display uppercase text-3xl tracking-tightest mb-6">Edit article</h1>
      <ArticleEditForm article={article} />
    </div>
  );
}
