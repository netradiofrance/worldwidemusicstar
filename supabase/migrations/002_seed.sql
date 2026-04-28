-- =====================================================================
-- Sample data for preview / pre-launch — admin-added entries (no payment)
-- Replace cover_url placeholders later with real Spotify covers.
-- =====================================================================

insert into tracks
  (artist_name, song_title, genre, email, spotify_followers, youtube_subscribers, votes_count, score, status, is_admin_added, paid_at)
values
  -- HipHop / Rap
  ('Kairo Vega',     'Midnight Empire',    'hiphop-rap', 'admin@worldwidemusicstar.com', 124800,  98300, 4210, 350510, 'active', true, now()),
  ('Saint Black',    'Down Bad',           'hiphop-rap', 'admin@worldwidemusicstar.com',  87200,  61500, 3105, 158015, 'active', true, now()),
  ('Lyric Houston',  'Reaper Season',      'hiphop-rap', 'admin@worldwidemusicstar.com',  46900,  38100, 2780, 93340,  'active', true, now()),

  -- Electro
  ('Polar Echo',     'Neon Drift',         'electro',    'admin@worldwidemusicstar.com', 211400, 142000, 3920, 365160, 'active', true, now()),
  ('Synthia Bloom',  'After Hours',        'electro',    'admin@worldwidemusicstar.com',  98200,  77600, 2640, 183720, 'active', true, now()),

  -- Pop
  ('Mira Solune',    'Heartbeat Highway',  'pop',        'admin@worldwidemusicstar.com', 318500, 254000, 5710, 589630, 'active', true, now()),
  ('Jules Avalon',   'Paper Crown',        'pop',        'admin@worldwidemusicstar.com', 142300, 110800, 4180, 265640, 'active', true, now()),

  -- Rock
  ('North Iron',     'Burn the Wire',      'rock',        'admin@worldwidemusicstar.com', 97500,  82400, 3340, 189920, 'active', true, now()),
  ('The Velvet Pact','Ghosts in Stereo',   'rock',        'admin@worldwidemusicstar.com', 64200,  51800, 2170, 122510, 'active', true, now()),

  -- Country
  ('Hannah Rivers',  'Front Porch Sundown','country',     'admin@worldwidemusicstar.com', 68400,  52200, 2510, 128130, 'active', true, now()),

  -- Latin
  ('Solana Cruz',    'Fuego Lento',        'latin',       'admin@worldwidemusicstar.com', 142800, 96400, 3870, 250810, 'active', true, now()),

  -- Jazz
  ('August Mercer',  'Blue Hour Blues',    'jazz',        'admin@worldwidemusicstar.com', 28400,  19200, 1280, 51440,  'active', true, now()),

  -- French
  ('Lina Nova',      'Coeur de Verre',     'french',      'admin@worldwidemusicstar.com', 56300,  41200, 2680, 105540, 'active', true, now()),

  -- Classical
  ('Ensemble Aurel', 'Allegro Lumen',      'classical',   'admin@worldwidemusicstar.com', 19400,  12800, 940,  35020,  'active', true, now()),

  -- World
  ('Kaya Sundara',   'Monsoon Lines',      'world',       'admin@worldwidemusicstar.com', 41200,  31600, 1840, 78320,  'active', true, now())

on conflict do nothing;

-- A few sample blog articles
insert into articles (slug, title, excerpt, content_md, status, generated_by, published_at, related_genre)
values
  (
    'how-fan-engagement-is-redefining-music-charts',
    'How Fan Engagement Is Redefining Music Charts',
    'A new generation of platforms is putting voting power back in the hands of fans — and the charts have never been more democratic.',
    '## The shift from passive listening to active participation

For decades, music charts were dictated by a handful of gatekeepers: radio playlists, label promotion budgets, and a narrow definition of what "popular" meant. The streaming era opened the door, but algorithmic playlists still concentrate power.

WorldWide Music Star takes a different approach: every fan vote counts, in real time, alongside Spotify followers and YouTube subscribers. The result is a chart that reflects what audiences actually want.

## Why it matters for indie artists

For independent artists without a label budget, traditional discovery is brutal. A fan-driven platform levels the field — a strong community can push a song to #1 in its genre, regardless of label affiliation.

## What is next

Look for fan-engagement metrics to expand beyond votes: think shares, playlist adds, and live show check-ins. The charts of 2026 will not just be about plays — they will be about people.',
    'published',
    'manual',
    now() - interval '2 days',
    null
  ),
  (
    'spotlight-rising-electro-acts-to-watch-in-2026',
    'Spotlight: Rising Electro Acts to Watch in 2026',
    'From Polar Echo to Synthia Bloom, here are the electro artists climbing fast on the WorldWide Music Star chart.',
    '## A genre in motion

Electronic music in 2026 is wider than ever — splitting into hyperpop, dark synth, club-ready tech, and ambient revival. Here are three acts gaining serious traction.

## Polar Echo

Their single *Neon Drift* combines glassy synths with a club-ready low end. The Spotify followers count crossed 200K this quarter and shows no signs of slowing.

## Synthia Bloom

A more cinematic take — *After Hours* feels closer to a Drive soundtrack outtake than a club banger. The slow burn is paying off in YouTube engagement.

## Where to find them

All three artists are charting in the Electro genre. Vote for your favorite to push them higher.',
    'published',
    'manual',
    now() - interval '5 days',
    'electro'
  ),
  (
    'the-business-of-being-charted-what-99-buys-you',
    'The Business of Being Charted: What $99 Buys You',
    'Why a flat-fee chart entry is reshaping how independent artists allocate marketing budgets.',
    '## The traditional path is broken

Indie marketing budgets used to disappear into ad spend with no measurable outcome. A flat $99 entry that puts you on a global chart, where your fan base can vote you up, is a fundamentally different proposition.

## What the fee covers

A spot on the genre chart, automatic Spotify follower and YouTube subscriber tracking, and eligibility for the monthly WorldWide Music Star award.

## What it does not do

It does not buy votes. The fans do that — and that is the whole point.',
    'published',
    'manual',
    now() - interval '8 days',
    null
  )
on conflict (slug) do nothing;
