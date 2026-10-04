"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// The Save bar for the staff compliance forms. It is rendered in a portal on document.body because the
// page slide animation wrapper (animate-pass-slide) keeps a CSS transform, and a transformed ancestor turns
// `position: fixed` into "fixed to that ancestor": the bar then sat at the bottom of the content, covered
// the last field and did not stick to the screen.
export function StickyBar({ children }: { children: React.ReactNode }) {
  // false on the server and during hydration, true in the browser afterwards (no effect needed)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(
    <>
      {/* the floating safety and chat buttons must never sit over Save: lift it above the bar while the bar is showing */}
      <style>{`[data-near-miss-fab], [data-ask-larder-fab] { bottom: 9.5rem !important; }`}</style>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-clay-brown/30 bg-parchment px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
    </>,
    document.body,
  );
}
