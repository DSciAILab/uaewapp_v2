import { cn } from '@/lib/utils';

/**
 * The two status glyphs for the task dashboard (UAE-23), drawn as a matched
 * pair: a filled disc with a checkmark for Done, and the same disc struck
 * through for Not Required. Inline SVG, not emoji, and they inherit currentColor
 * so a cell can tint them with its own status tone.
 */

interface IconProps {
  className?: string;
}

/** Done — filled disc, checkmark. */
export function DoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 12.5l3 3 6-6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Not Required — the same disc, struck through. */
export function NotRequiredIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 6l12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
