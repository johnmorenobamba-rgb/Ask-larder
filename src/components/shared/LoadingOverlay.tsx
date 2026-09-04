import { ChitMark } from "./ChitMark";

/**
 * Route-navigation loading state -- dimmed Ink scrim + the same chit mark
 * used everywhere else in the app (Ask Larder tile, floating bubble,
 * splash), already doing exactly the "traced by a glow" idle loop this
 * needed. No fork, no bespoke spinner: this is the app's one "something is
 * alive/working" visual language, reused rather than reinvented.
 *
 * Rendered as a Next.js `loading.tsx` (App Router Suspense fallback) at
 * each protected route tree's root, so it covers every navigation within
 * that tree automatically -- not wired per-page. `fixed inset-0` covers
 * the full viewport (including the persistent top bar/floating chrome
 * that live in the surrounding layout, outside the suspended subtree),
 * matching the "background is greyed out" ask rather than only dimming
 * the content area.
 *
 * The entrance is delayed ~150ms (`.animate-loading-overlay-in`, globals.css)
 * so a fast navigation never flashes it at all -- it only ever becomes
 * visible once a wait is actually long enough to need explaining.
 */
export function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
    >
      <span className="sr-only">Loading…</span>
      <div className="animate-loading-overlay-in">
        <ChitMark size={64} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
      </div>
    </div>
  );
}
