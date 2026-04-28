/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
