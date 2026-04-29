/**
 * YouTube Data API v3 helpers — extended edition.
 *
 * Supports three URL formats:
 *   - https://www.youtube.com/watch?v=VIDEO_ID         (video)
 *   - https://www.youtube.com/channel/UCxxxx          (channel by id)
 *   - https://www.youtube.com/@handle                 (channel by handle)
 *
 * Quota: 10,000 units/day on a fresh project.
 *   videos.list  = 1 unit
 *   channels.list = 1 unit
 *   search.list  = 100 units (used as last-resort fallback for handle resolution)
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

/**
 * Try to extract a channel id (UCxxxx) directly from the URL.
 * Returns null if it's a handle (@xxx) or a custom URL — those need an API call.
 */
export function extractYouTubeChannelId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Try to extract a handle (@xxx) from a channel URL.
 * Returns null if not a handle URL.
 */
export function extractYouTubeHandle(url: string): string | null {
  if (!url) return null;
  const m = url.match(/youtube\.com\/@([A-Za-z0-9._-]+)/);
  return m ? m[1] : null;
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
  return parseInt(stats.subscriberCount ?? '0', 10) || 0;
}

/**
 * Resolve a handle (@username) to a channel id (UCxxxx) using the
 * channels.list endpoint with the forHandle parameter (added 2023).
 * Costs 1 quota unit. Returns null if the handle does not resolve.
 */
export async function resolveHandleToChannelId(handle: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.items?.[0]?.id ?? null;
}

/**
 * One-shot resolution: given any youtube URL, return a channel id.
 * Tries (in order):
 *   1. /channel/UCxxx — extracted directly
 *   2. /@handle — resolved via API
 *   3. /watch?v=ID — extracted via getVideoInfo
 * Returns null if nothing works.
 */
export async function resolveAnyYoutubeUrlToChannelId(
  url: string,
): Promise<{ channelId: string | null; videoId: string | null }> {
  if (!url) return { channelId: null, videoId: null };

  // 1. Direct channel id
  const direct = extractYouTubeChannelId(url);
  if (direct) return { channelId: direct, videoId: null };

  // 2. Handle (@xxx)
  const handle = extractYouTubeHandle(url);
  if (handle) {
    const resolved = await resolveHandleToChannelId(handle);
    if (resolved) return { channelId: resolved, videoId: null };
  }

  // 3. Video URL — extract videoId, then look up the channel
  const videoId = extractYouTubeVideoId(url);
  if (videoId) {
    try {
      const info = await getVideoInfo(videoId);
      if (info) return { channelId: info.channelId, videoId };
    } catch { /* fall through */ }
  }

  return { channelId: null, videoId: null };
}
