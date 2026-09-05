// Block N3 -- most components in this app already have a clean
// `prefers-reduced-motion` fallback (real accessibility work, not added
// for this video), which renders the correct FINAL/static value instead
// of a wall-clock-driven animation (AnimatedNumber's rAF count-up,
// BentoGrid's own on-mount reveal gates, etc.). Remotion's headless render
// doesn't virtualize `performance.now()`/rAF to match the frame being
// captured, so those real-time animations land on whatever the browser's
// wall clock happened to reach by the time that frame was screenshotted --
// not deterministic, and not reliably showing the intended final state.
// Forcing reduced-motion globally settles every one of those for free,
// without touching each component individually. The one animation the
// video explicitly wants alive on camera (ChitMark's traced-glow reveal)
// is driven instead via its own `driveFrameSeconds` prop, which is coded
// to take priority over this forced setting -- see ChitMark.tsx's doc
// comment.
if (typeof window !== "undefined") {
  const realMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query: string) => {
    if (query.includes("prefers-reduced-motion")) {
      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList;
    }
    return realMatchMedia(query);
  };
}

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
