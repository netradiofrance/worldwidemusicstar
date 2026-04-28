import Image from 'next/image';

interface Props {
  src: string | null;
  alt: string;
  size?: number;        // pixel size, square
  className?: string;
}

/**
 * Renders the album cover. Falls back to a vibrant gradient initial
 * tile when no cover is available (admin-added entries pre-seed).
 */
export function CoverImage({ src, alt, size = 64, className = '' }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-md object-cover ${className}`}
      />
    );
  }
  // Fallback: deterministic gradient based on the alt text
  const initial = (alt?.[0] ?? '?').toUpperCase();
  const hash = Array.from(alt).reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [
    'from-brand to-brand-dark',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-blue-700',
    'from-pink-500 to-rose-700',
    'from-violet-500 to-purple-700',
    'from-emerald-500 to-teal-700',
  ];
  const grad = hues[hash % hues.length];
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-md bg-gradient-to-br ${grad} flex items-center justify-center font-display text-white ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.45) }}>{initial}</span>
    </div>
  );
}
