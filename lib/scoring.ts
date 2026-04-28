/**
 * Score formula for the chart ranking.
 *
 * Defaults (based on previous decisions):
 *   - Fan votes weighted x3 (engagement is the core differentiator)
 *   - Spotify followers weighted x1
 *   - YouTube subscribers weighted x1
 *
 * To tweak later, change the constants here OR move them to env vars
 * (NEXT_PUBLIC_SCORE_VOTES_WEIGHT, etc.) — all chart pages will pick it up
 * because the score is recomputed on every refresh cron.
 */
export const SCORE_WEIGHTS = {
  votes: 3,
  spotify: 1,
  youtube: 1,
} as const;

export interface ScoreInputs {
  votes_count: number;
  spotify_followers: number;
  youtube_subscribers: number;
}

export function computeScore(t: ScoreInputs): number {
  const v = Math.max(0, t.votes_count) * SCORE_WEIGHTS.votes;
  const s = Math.max(0, t.spotify_followers) * SCORE_WEIGHTS.spotify;
  const y = Math.max(0, t.youtube_subscribers) * SCORE_WEIGHTS.youtube;
  return Number((v + s + y).toFixed(2));
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'K';
  return (n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, '') + 'M';
}
