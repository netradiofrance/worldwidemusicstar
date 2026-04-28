/**
 * YouTube Data API v3 helpers.
 * Quota: 10,000 units/day on a fresh project. We cache aggressively
 * (per-track refresh max once every 6h) so quota is comfortable.
 *
 * Costs:
 *   videos.list  = 1 unit
 *   channels.list = 1 unit
 *   per refresh per track = 2 units (1 video + 1 channel lookup)
 *   1000 tracks every 6h = 4000 * 2 = 8000 / day -> within quota.
 */

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([^&#]+)/,                  // youtube.com/watch?v=ID
    /youtu\.be\/([^?#]+)/,             // youtu.be/ID
    /youtube\.com\/embed\/([^?#]+)/,   // /embed/ID
    /youtube\.com\/shorts\/([^?#]+)/,  // /shorts/ID
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface VideoInfo {
  videoId: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  title: string;
}

export async function getVideoInfo(videoId: string): Promise<VideoInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`YouTube video lookup failed: ${res.status}`);
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item) return null;
  const sn = item.snippet;
  return {
    videoId,
    channelId: sn.channelId,
    channelTitle: sn.channelTitle,
    thumbnailUrl:
      sn.thumbnails?.maxres?.url ??
      sn.thumbnails?.high?.url ??
      sn.thumbnails?.default?.url ?? null,
    title: sn.title,
  };
}

export async function getChannelSubscribers(channelId: string): Promise<number> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`YouTube channel lookup failed: ${res.status}`);
  const data = await res.json();
  const stats = data?.items?.[0]?.statistics;
  if (!stats) return 0;
  // Note: subscriberCount may be hidden. When hidden, returns "0".
  return parseInt(stats.subscriberCount ?? '0', 10) || 0;
}
