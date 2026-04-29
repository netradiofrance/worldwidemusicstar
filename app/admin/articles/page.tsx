import { createServerClient } from '@/lib/supabase';
import { ArticleListActions } from '@/components/admin/ArticleListActions';
import { GenerateArticleButton } from '@/components/admin/GenerateArticleButton';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  const sb = createServerClient();
  const { data: articles } = await sb
    .from('articles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display uppercase text-4xl tracking-tightest mb-1">Articles</h1>
          <p className="text-ink-300">Review AI-generated drafts, edit, publish.</p>
        </div>
        <GenerateArticleButton />
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-800/60 text-[10px] uppercase tracking-widest text-ink-300">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Updated</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(articles ?? []).map(a => (
              <tr key={a.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <div className="text-white font-semibold line-clamp-1">{a.title}</div>
                  <div className="text-xs text-ink-400 line-clamp-1">{a.excerpt}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={[
                    'text-[10px] uppercase tracking-wider rounded-full px-2 py-1 font-semibold',
                    a.status === 'published' ? 'bg-emerald-500/15 text-emerald-300' :
                    a.status === 'draft' ? 'bg-amber-500/15 text-amber-300' :
                    'bg-ink-700 text-ink-300',
                  ].join(' ')}>{a.status}</span>
                </td>
                <td className="px-4 py-3 text-ink-300">{a.generated_by}</td>
                <td className="px-4 py-3 text-ink-300">{new Date(a.updated_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <ArticleListActions article={a} />
                </td>
              </tr>
            ))}
            {(!articles || articles.length === 0) && (
              <tr><td colSpan={5} className="text-center text-ink-400 py-10">No articles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
