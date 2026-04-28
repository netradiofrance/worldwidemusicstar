import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { getAdminFromCookie } from '@/lib/admin-auth';
import { LayoutDashboard, Music, FileText, Trophy } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';

  // The login page renders without the sidebar chrome. Auth itself is
  // enforced by middleware.ts — we don't redirect from this layout to
  // avoid loop edge-cases when middleware doesn't run.
  if (pathname.endsWith('/admin/login') || pathname === '/admin/login') {
    return <>{children}</>;
  }

  const session = await getAdminFromCookie();

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <aside className="w-60 bg-ink-900 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <Link href="/admin/dashboard" className="block">
            <Image src="/logo.png" alt="WorldWide Music Star Admin" width={180} height={42} className="h-8 w-auto" />
          </Link>
          <div className="text-[10px] uppercase tracking-widest text-brand mt-2 font-bold">Admin</div>
        </div>
        <nav className="flex-1 p-4 space-y-1 text-sm">
          <NavLink href="/admin/dashboard" icon={<LayoutDashboard size={16} />}>Dashboard</NavLink>
          <NavLink href="/admin/artists"   icon={<Music size={16} />}>Artists & Tracks</NavLink>
          <NavLink href="/admin/articles"  icon={<FileText size={16} />}>Articles</NavLink>
          <NavLink href="/admin/awards"    icon={<Trophy size={16} />}>Awards & Archives</NavLink>
        </nav>
        <div className="p-4 border-t border-white/5">
          {session && <div className="text-xs text-ink-400 mb-3 truncate">{session.email}</div>}
          <AdminLogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 rounded-md text-ink-200 hover:text-white hover:bg-white/5">
      {icon}{children}
    </Link>
  );
}
