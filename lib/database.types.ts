// Database types — kept in sync with supabase/migrations/001_init.sql
// and subsequent migrations. You can also auto-generate this file with
// `supabase gen types typescript` once the project is linked, but this
// hand-rolled version is fine to start.

export type GenreSlug =
  | 'hiphop-rap'
  | 'electro'
  | 'dance'
  | 'pop'
  | 'rock'
  | 'metal'
  | 'country'
  | 'latin'
  | 'reggae'
  | 'funk'
  | 'jazz'
  | 'french'
  | 'classical'
  | 'soundtrack'
  | 'gospel'
  | 'world';

export type EntryStatus = 'pending_payment' | 'active' | 'rejected' | 'archived';
export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type PaymentProvider = 'paypal' | 'stripe' | 'vivid' | 'manual';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Track {
  id: string;
  artist_name: string;
  song_title: string;
  genre: GenreSlug;
  email: string;
  spotify_url: string | null;
  spotify_track_id: string | null;
  spotify_artist_id: string | null;
  cover_url: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  youtube_channel_id: string | null;
  votes_count: number;
  spotify_followers: number;
  spotify_followers_updated_at: string | null;
  youtube_subscribers: number;
  youtube_subscribers_updated_at: string | null;
  score: number;
  status: EntryStatus;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  archived_at: string | null;
  paid_at: string | null;
  unsubscribed_at: string | null;
  payment_reminder_sent_at: string | null;
  payment_reminder_count: number | null;
  is_admin_added: boolean | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  cover_url: string | null;
  related_genre: GenreSlug | null;
  related_track_id: string | null;
  status: ArticleStatus;
  generated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  track_id: string;
  voter_hash: string;
  ip_inet: string | null;
  user_agent: string | null;
  ad_session_id: string | null;
  ad_completed: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  track_id: string;
  provider: PaymentProvider;
  provider_order_id: string | null;
  provider_capture_id: string | null;
  amount_usd: number;
  status: PaymentStatus;
  raw_payload: any | null;
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

/**
 * Per-rank snapshot row used by the monthly archives page.
 *
 * Each entry represents one position in a frozen ranking — kept as a
 * compact row rather than re-querying the original track at archive
 * read time. That way archived rankings stay immutable even if the
 * track row is later edited or deleted.
 */
export interface ArchivedRanking {
  rank: number;
  track_id: string;
  artist: string;
  song: string;
  score: number;
  votes: number;
  spotify: number;
  youtube: number;
  cover_url: string | null;
}

/**
 * Frozen monthly chart snapshot. The full ranking is stored as a JSON
 * array on a single row keyed by (period_year, period_month, genre).
 * `genre = null` represents the overall (all-charts) snapshot.
 */
export interface ChartArchive {
  id: string;
  period_year: number;
  period_month: number;
  genre: GenreSlug | null;
  ranking: ArchivedRanking[];
  created_at: string;
}

export interface Award {
  id: string;
  period_year: number;
  period_month: number;
  track_id: string;
  votes_count: number;
  score: number;
  trophy_image_url: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

// Supabase typed client convenience type
export interface Database {
  public: {
    Tables: {
      genres: {
        Row: { slug: GenreSlug; name: string; display_order: number; created_at: string };
        Insert: { slug: GenreSlug; name: string; display_order?: number };
        Update: Partial<{ slug: GenreSlug; name: string; display_order: number }>;
      };
      tracks:        { Row: Track;        Insert: Partial<Track>;        Update: Partial<Track> };
      articles:      { Row: Article;      Insert: Partial<Article>;      Update: Partial<Article> };
      votes:         { Row: Vote;         Insert: Partial<Vote>;         Update: Partial<Vote> };
      payments:      { Row: Payment;      Insert: Partial<Payment>;      Update: Partial<Payment> };
      subscribers:   { Row: Subscriber;   Insert: Partial<Subscriber>;   Update: Partial<Subscriber> };
      chart_archives:{ Row: ChartArchive; Insert: Partial<ChartArchive>; Update: Partial<ChartArchive> };
      awards:        { Row: Award;        Insert: Partial<Award>;        Update: Partial<Award> };
      admin_users:   { Row: AdminUser;    Insert: Partial<AdminUser>;    Update: Partial<AdminUser> };
    };
  };
}
