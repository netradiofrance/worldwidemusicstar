/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Image optimization disabled — images are served directly from
    // their origin CDN without passing through Vercel's transformer.
    //
    // Why: Vercel's Hobby plan caps Image Optimization at 5000
    // transforms/month. Multi-format (webp/avif) and multi-size
    // (mobile/desktop/retina) variants multiply the count fast, and
    // we were hitting the ceiling each month — producing broken
    // images for visitors mid-cycle. The origin CDNs we rely on
    // (Spotify, YouTube, OpenAI blob, Supabase Storage) are already
    // globally distributed and fast, so the perceptible loss is
    // minimal while the operational gain (no quota cliff) is real.
    //
    // The remotePatterns are kept so that <Image> components still
    // know which hostnames are allowed. They no longer trigger
    // transformation when `unoptimized: true` is set.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },           // Spotify album art
      { protocol: 'https', hostname: 'mosaic.scdn.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },         // YouTube thumbnails
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: '*.supabase.co' },       // Supabase Storage
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' }, // OpenAI images
    ],
  },
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
};
module.exports = nextConfig;
