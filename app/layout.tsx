import type { Metadata } from 'next';
import './globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'WorldWide Music Star — The Power to Be Charted',
    template: '%s | WorldWide Music Star',
  },
  description:
    'The global music chart platform powered by fan votes, Spotify followers, and YouTube subscribers. Where independent artists become stars.',
  keywords: ['music chart','indie artists','music platform','fan votes','Spotify','YouTube','music ranking'],
  openGraph: {
    type: 'website',
    siteName: 'WorldWide Music Star',
    url: SITE,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'WorldWide Music Star' }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  themeColor: '#0A0A0A',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Google IMA SDK (loaded once globally for the vote ad popup) */}
        <script async src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
      </head>
      <body className="bg-ink-900 text-ink-50 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
