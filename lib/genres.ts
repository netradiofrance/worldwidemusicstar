import type { GenreSlug } from './database.types';

export interface GenreMeta {
  slug: GenreSlug | 'all';
  name: string;
  short: string;
  description: string;
  accentClass: string;       // tailwind text color class
  bgClass: string;           // tailwind bg color class for accents
}

// The order of this array drives the display order in nav menus and grids.
// Each genre has its own accent color so charts feel distinct at a glance.
export const GENRES: GenreMeta[] = [
  { slug: 'all',         name: 'All Charts',    short: 'All',        description: 'The combined ranking across every genre.',                accentClass: 'text-brand',        bgClass: 'bg-brand' },
  { slug: 'hiphop-rap',  name: 'HipHop / Rap',  short: 'HipHop',     description: 'The biggest names in hip-hop and rap.',                   accentClass: 'text-amber-400',    bgClass: 'bg-amber-500' },
  { slug: 'electro',     name: 'Electro',       short: 'Electro',    description: 'Electronic, dance and club tracks.',                      accentClass: 'text-cyan-400',     bgClass: 'bg-cyan-500' },
  { slug: 'dance',       name: 'Dance',         short: 'Dance',      description: 'Dance-floor anthems, house, EDM crossovers.',             accentClass: 'text-fuchsia-400',  bgClass: 'bg-fuchsia-500' },
  { slug: 'pop',         name: 'Pop',           short: 'Pop',        description: 'Today\u2019s biggest pop hits.',                          accentClass: 'text-pink-400',     bgClass: 'bg-pink-500' },
  { slug: 'rock',        name: 'Rock',          short: 'Rock',       description: 'Rock, alt-rock and indie rock.',                          accentClass: 'text-red-400',      bgClass: 'bg-red-500' },
  { slug: 'metal',       name: 'Metal',         short: 'Metal',      description: 'Heavy metal, hard rock and beyond.',                      accentClass: 'text-zinc-300',     bgClass: 'bg-zinc-500' },
  { slug: 'country',     name: 'Country',       short: 'Country',    description: 'Country, Americana and bluegrass.',                       accentClass: 'text-orange-400',   bgClass: 'bg-orange-500' },
  { slug: 'latin',       name: 'Latin',         short: 'Latin',      description: 'Reggaeton, Latin pop and beyond.',                        accentClass: 'text-yellow-400',   bgClass: 'bg-yellow-500' },
  { slug: 'reggae',      name: 'Reggae',        short: 'Reggae',     description: 'Reggae, dub, dancehall and roots.',                       accentClass: 'text-lime-400',     bgClass: 'bg-lime-500' },
  { slug: 'funk',        name: 'Funk',          short: 'Funk',       description: 'Funk, soul, disco grooves.',                              accentClass: 'text-purple-400',   bgClass: 'bg-purple-500' },
  { slug: 'jazz',        name: 'Jazz',          short: 'Jazz',       description: 'Modern and classic jazz.',                                accentClass: 'text-violet-400',   bgClass: 'bg-violet-500' },
  { slug: 'french',      name: 'French',        short: 'French',     description: 'The best of French-language music.',                      accentClass: 'text-blue-400',     bgClass: 'bg-blue-500' },
  { slug: 'classical',   name: 'Classical',     short: 'Classical',  description: 'Classical and contemporary orchestral.',                  accentClass: 'text-emerald-400',  bgClass: 'bg-emerald-500' },
  { slug: 'soundtrack',  name: 'Soundtrack',    short: 'Soundtrack', description: 'Film, TV and game soundtracks.',                          accentClass: 'text-sky-400',      bgClass: 'bg-sky-500' },
  { slug: 'gospel',      name: 'Gospel',        short: 'Gospel',     description: 'Gospel, spiritual and contemporary Christian music.',     accentClass: 'text-amber-300',    bgClass: 'bg-amber-400' },
  { slug: 'world',       name: 'World',         short: 'World',      description: 'World, fusion and global sounds.',                        accentClass: 'text-teal-400',     bgClass: 'bg-teal-500' },
];

export const GENRE_BY_SLUG: Record<string, GenreMeta> = Object.fromEntries(
  GENRES.map(g => [g.slug, g]),
);

export const PUBLIC_GENRES: GenreMeta[] = GENRES.filter(g => g.slug !== 'all');

export function isValidGenreSlug(slug: string): slug is GenreSlug {
  return PUBLIC_GENRES.some(g => g.slug === slug);
}
