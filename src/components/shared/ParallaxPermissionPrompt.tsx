"use client";

/**
 * Block L7 -- one-time tap affordance for iOS Safari's gyroscope
 * permission gate (`DeviceOrientationEvent.requestPermission()` can only
 * be called from a real user gesture, never automatically). Purely
 * presentational -- the caller owns the single `useViewportParallax()`
 * instance for the page and passes its state down, so this doesn't spin up
 * a second listener of its own.
 */
export function ParallaxPermissionPrompt({ visible, onEnable }: { visible: boolean; onEnable: () => void }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 shadow-lg">
      <p className="font-sans text-sm text-parchment">Tilt your device for a closer look?</p>
      <button
        type="button"
        onClick={onEnable}
        className="shrink-0 rounded-full bg-parchment px-4 py-2 font-sans text-sm font-medium text-ink"
      >
        Enable
      </button>
    </div>
  );
}
