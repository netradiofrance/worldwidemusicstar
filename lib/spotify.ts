/**
 * Minimal Spotify Web API wrapper using Client Credentials flow.
 * Used for: searching tracks (auto-fill on signup) and refreshing
 * artist follower counts on a schedule.
 */

interface SpotifyToken { access_token: string; expires_at: number }
let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 30_000) {
    return cachedToken.access_token;
  }
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Spotify client credentials missing');

  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Spotify token error: ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

export interface SpotifyTrackResult {
  id: string;
  name: string;
  artist_name: string;
  artist_id: string;
  album_cover_url: string | null;
  external_url: string;
  preview_url: string | null;
}

export async function searchTrack(query: string): Promise<SpotifyTrackResult[]> {
  const token = await getAccessToken();
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8&market=US`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Spotify search error: ${res.status}`);
  const data = await res.json();
  const items = (data?.tracks?.items ?? []) as Array<{
    id: string;
    name: string;
    preview_url: string | null;
    artists: Array<{ id: string; name: string }>;
    album: { images: Array<{ url: string; width: number; height: number }> };
    external_urls: { spotify: string };
  }>;
  return items.map(it => ({
    id: it.id,
    name: it.name,
    artist_name: it.artists[0]?.name ?? '',
    artist_id: it.artists[0]?.id ?? '',
    album_cover_url: it.album?.images?.[0]?.url ?? null,
    external_url: it.external_urls?.spotify ?? '',
    preview_url: it.preview_url,
  }));
}

export async function getArtistFollowers(artistId: string): Promise<number> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Spotify artist error: ${res.status}`);
  const data = await res.json() as { followers?: { total?: number } };
  return data.followers?.total ?? 0;
}
