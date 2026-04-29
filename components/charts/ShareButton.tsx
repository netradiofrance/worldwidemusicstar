'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface Props {
  url: string;
  title: string;
  text?: string;
  /** Style variant — keeps the button tonally adjacent to Vote in lists */
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * Share button.
 *
 * On supported browsers (mobile mainly + Safari desktop), invokes the
 * native share sheet via navigator.share. Falls back to copying the URL
 * to the clipboard with a transient "copied" check icon. Also falls back
 * to a plain mailto if clipboard isn't allowed.
 *
 * The URL passed in should be absolute. The component does NOT prepend
 * the origin — caller decides what to share (chart link, track link, …).
 */
export function ShareButton({ url, title, text, variant = 'compact', className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Prefer the native share sheet
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url, title, text: text ?? title });
        return;
      } catch (err: any) {
        // User cancelled — do nothing further. Network share APIs throw
        // AbortError when the user dismisses the sheet.
        if (err?.name === 'AbortError') return;
        // Other errors → fall through to clipboard fallback
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last-ditch fallback — open a mailto with the link
      window.open(
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
      );
    }
  }

  const baseClasses =
    variant === 'full'
      ? 'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-semibold px-5 py-2.5 transition-colors'
      : 'inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/5 text-white font-semibold px-3 py-1.5 text-sm transition-colors';

  return (
    <button type="button" onClick={onClick} className={`${baseClasses} ${className}`} aria-label="Share">
      {copied ? (
        <>
          <Check size={variant === 'full' ? 18 : 14} className="text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Share2 size={variant === 'full' ? 18 : 14} />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
