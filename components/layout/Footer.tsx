import Link from 'next/link';
import Image from 'next/image';
import { PUBLIC_GENRES } from '@/lib/genres';

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-32 pt-16 pb-10 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2">
            <Image src="/logo.png" alt="WorldWide Music Star" width={220} height={52} className="h-10 w-auto mb-4 opacity-90" />
            <p className="text-ink-300 text-sm max-w-xs leading-relaxed">
              The global music chart platform powered by fan votes, Spotify followers and YouTube subscribers.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-4">Charts</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/charts/all" className="text-ink-200 hover:text-white">All Charts</Link></li>
              {PUBLIC_GENRES.slice(0,5).map(g => (
                <li key={g.slug}>
                  <Link href={`/charts/${g.slug}`} className="text-ink-200 hover:text-white">{g.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/add-a-song" className="text-ink-200 hover:text-white">Add a Song</Link></li>
              <li><Link href="/blog" className="text-ink-200 hover:text-white">Music Blog</Link></li>
              <li><Link href="/archives" className="text-ink-200 hover:text-white">Archives</Link></li>
              <li><Link href="/legal" className="text-ink-200 hover:text-white">Legal &amp; Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs text-ink-400">
          <p>© {new Date().getFullYear()} WorldWide Music Star. All rights reserved.</p>
          <p className="uppercase tracking-widest">The Power to Be Charted</p>
        </div>
      </div>
    </footer>
  );
}
