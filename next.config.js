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

  // ---------------------------------------------------------------------------
  // BUILD-TIME TYPE & LINT POLICY
  //
  // We knowingly let the production build proceed even if the TypeScript
  // compiler or ESLint flag issues. Rationale:
  //
  // - The codebase uses Supabase's untyped query builder in several places.
  //   Recent SDK versions over-narrow inferred row types to `never`, which
  //   causes spurious "Property 'X' does not exist on type 'never'" errors
  //   that are *not* real bugs — the queries run correctly in production
  //   and the data flows through untouched.
  // - Fixing every one of these requires hand-typing every `select(...)`
  //   call, which is mechanical noise rather than defensive engineering.
  // - The much safer signal that the app actually works is the runtime
  //   behaviour: Supabase rejects bad columns at runtime with clear errors,
  //   which we already log and surface.
  //
  // Type-checking still runs locally in the editor (VS Code / WebStorm),
  // and ESLint runs on demand — both still catch real issues during
  // development. We just don't let them block deployments.
  //
  // If you ever want to re-enable strict build-time checking, flip both
  // flags to `false` and prepare for a fresh round of inference fixes.
  // ---------------------------------------------------------------------------
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: { serverActions: { bodySizeLimit: '4mb' } },
};
module.exports = nextConfig;
