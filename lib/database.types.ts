// Database types — kept in sync with supabase/migrations/001_init.sql.
// You can also auto-generate this file with `supabase gen types typescript`
// once the project is linked, but this hand-rolled version is fine to start.

export type GenreSlug =
  | 'hiphop-rap'
  | 'electro'
  | 'pop'
  | 'rock'
  | 'country'
  | 'latin'
  | 'jazz'
  | 'french'
  | 'classical'
  | 'world';

export type EntryStatus = 'pending_payment' | 'active' | 'rejected' | 'archived';
export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type PaymentProvider = 'paypal' | 'stripe' | 'manual';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Track {
  id: string;
  artist_name: string;
  song_title: string;
  genre: GenreSlug;
  email: string;
  spotify_track_id: string | null;
  spotify_url: string | null;
  spotify_followers: number;
  spotify_followers_updated_at: string | null;
  cover_url: string | null;
  youtube_url: string | null;
  youtube_channel_id: string | null;
  youtube_video_id: string | null;
  youtube_subscribers: number;
  youtube_subscribers_updated_at: string | null;
  votes_count: number;
  score: number;
  status: EntryStatus;
  is_admin_added: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  cover_url: string | null;
  cover_prompt: string | null;
  related_track_id: string | null;
  related_genre: GenreSlug | null;
  status: ArticleStatus;
  generated_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface ChartArchive {
  id: string;
  period_year: number;
  period_month: number;
  genre: GenreSlug | null;
  ranking: ArchivedRanking[];
  created_at: string;
}

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

export type Database = {
  public: {
    Tables: {
      tracks: {
        Row: Track;
        Insert: Partial<Track> &
          Pick<Track, 'artist_name' | 'song_title' | 'genre' | 'email'>;
        Update: Partial<Track>;
      };
      articles: {
        Row: Article;
        Insert: Partial<Article> & Pick<Article, 'slug' | 'title' | 'content_md'>;
        Update: Partial<Article>;
      };
      awards: { Row: Award; Insert: Partial<Award>; Update: Partial<Award> };
      chart_archives: {
        Row: ChartArchive;
        Insert: Partial<ChartArchive>;
        Update: Partial<ChartArchive>;
      };
      genres: {
        Row: { slug: GenreSlug; name: string; display_order: number; created_at: string };
        Insert: { slug: GenreSlug; name: string; display_order?: number };
        Update: Partial<{ slug: GenreSlug; name: string; display_order: number }>;
      };
      subscribers: {
        Row: { id: string; email: string; source: string; confirmed: boolean; created_at: string };
        Insert: { email: string; source?: string; confirmed?: boolean };
        Update: Partial<{ email: string; source: string; confirmed: boolean }>;
      };
      payments: {
        Row: {
          id: string; track_id: string | null;
          provider: PaymentProvider; provider_order_id: string | null;
          provider_capture_id: string | null;
          amount_usd: number; currency: string; status: PaymentStatus;
          raw_payload: unknown; created_at: string; completed_at: string | null;
        };
        Insert: { track_id?: string | null; provider: PaymentProvider; amount_usd: number; status?: PaymentStatus; provider_order_id?: string | null; raw_payload?: unknown };
        Update: Partial<{ status: PaymentStatus; provider_capture_id: string | null; raw_payload: unknown; completed_at: string | null }>;
      };
      votes: {
        Row: { id: string; track_id: string; voter_hash: string; ip_inet: string | null; user_agent: string | null; ad_session_id: string | null; ad_completed: boolean; created_at: string };
        Insert: { track_id: string; voter_hash: string; ip_inet?: string | null; user_agent?: string | null; ad_session_id?: string | null; ad_completed?: boolean };
        Update: Partial<{ ad_completed: boolean }>;
      };
      admin_users: {
        Row: { id: string; email: string; password_hash: string; role: string; created_at: string; last_login_at: string | null };
        Insert: { email: string; password_hash: string; role?: string };
        Update: Partial<{ password_hash: string; role: string; last_login_at: string }>;
      };
    };
  };
};
