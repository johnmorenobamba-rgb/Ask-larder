/**
 * The app's one small "working" spinner, for inline pending states (a
 * tapped link, a busy button). A quarter arc in currentColor over a faint
 * full ring, so it inherits the surrounding text colour on Ink and on
 * Parchment alike. Under prefers-reduced-motion the arc stops rotating
 * (globals.css) but stays visible, so the state still reads.
 *
 * Purely visual (aria-hidden): the control it sits in carries the
 * accessible busy label ("Saving", "Approving") or aria-busy.
 */
export function InlineSpinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`inline-spinner shrink-0 ${className}`}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
