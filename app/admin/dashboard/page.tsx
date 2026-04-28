import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { Music, Vote, FileText, Trophy, ArrowUpRight, Sparkles, RefreshCw } from 'lucide-react';
import { GENRE_BY_SLUG } from '@/lib/genres';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const sb = createServerClient();
  const [tracks, votesToday, drafts, allActive] = await Promise.all([
    sb.from('tracks').select('id, status', { count: 'exact', head: true }),
    sb.from('votes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()),
    sb.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    sb.from('tracks').select('*').eq('status', 'active').order('score', { ascending: false }).limit(5),
  ]);

  const total = tracks.count ?? 0;
  const todayVotes = votesToday.count ?? 0;
  const draftCount = drafts.count ?? 0;
  const top = allActive.data ?? [];

  return (
    <div>
      <h1 className="font-display uppercase text-4xl tracking-tightest mb-2">Dashboard</h1>
      <p className="text-ink-300 mb-8">Quick overview of platform activity.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat icon={<Music size={18} />} label="Total tracks"           value={total} />
        <Stat icon={<Vote size={18} />}  label="Votes today"           value={todayVotes} />
        <Stat icon={<FileText size={18} />} label="Pending articles"   value={draftCount}
              href="/admin/articles" />
        <Stat icon={<Trophy size={18} />} label="Awards"                value={'—'} href="/admin/awards" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <div className="rounded-xl bg-ink-900 border border-white/5 p-6">
          <h2 className="font-display uppercase text-xl mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 gap-2">
            <ActionLink href="/admin/artists?new=1" icon={<Sparkles size={14} />}>
              Add a track without payment
            </ActionLink>
            <ActionForm action="/api/blog/generate" label="Generate a new article (AI draft)" icon={<Sparkles size={14} />} />
            <ActionForm action="/api/cron/refresh-counters" label="Refresh Spotify + YouTube counters now" icon={<RefreshCw size={14} />} />
            <ActionForm action="/api/cron/monthly-archive" label="Force monthly archive snapshot" icon={<Trophy size={14} />} />
          </div>
        </div>

        <div className="rounded-xl bg-ink-900 border border-white/5 p-6">
          <h2 className="font-display uppercase text-xl mb-4">Top 5 — overall</h2>
          {top.length === 0 ? (
            <p className="text-ink-400 text-sm">No active tracks yet.</p>
          ) : (
            <ol className="space-y-2">
              {top.map((t, i) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-2xl text-ink-300 w-6 text-center">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{t.song_title}</div>
                      <div className="text-xs text-ink-300 truncate">{t.artist_name} · {GENRE_BY_SLUG[t.genre]?.name}</div>
                    </div>
                  </div>
                  <Link href={`/admin/artists?id=${t.id}`} className="text-xs text-brand hover:underline">Edit</Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="rounded-xl bg-ink-900 border border-white/5 p-5 hover:border-brand/40 transition-colors">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-300 mb-2">
        {icon}{label}
      </div>
      <div className="font-display text-4xl text-white">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActionLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 text-sm">
      <span className="flex items-center gap-2">{icon}{children}</span>
      <ArrowUpRight size={14} className="text-ink-400" />
    </Link>
  );
}

function ActionForm({ action, label, icon }: { action: string; label: string; icon: React.ReactNode }) {
  return (
    <form action={action} method="post" className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 text-sm">
      <span className="flex items-center gap-2">{icon}{label}</span>
      <button type="submit" className="text-brand text-xs font-semibold">Run →</button>
    </form>
  );
}
