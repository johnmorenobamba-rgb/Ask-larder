import { forwardRef } from "react";

/**
 * Block N1/N2 — the lying-flat iPad mockup MarketingHero pins and drives via
 * GSAP scroll transforms (rotateX/translateY live on the returned root
 * element via the forwarded ref, not here — this component only owns the
 * static frame markup). `children` renders into the screen area — Block N2
 * puts HeroSplashPreview and the baked tile-drop video there; both need
 * `transform-style: preserve-3d` unbroken down to the screen div itself (not
 * just the outer bezel) so their own transforms compose through the
 * tablet's own tilt instead of pasting flat on top of it.
 */
export const IpadMockup = forwardRef<
  HTMLDivElement,
  { className?: string; style?: React.CSSProperties; children?: React.ReactNode }
>(function IpadMockup({ className = "", style, children }, ref) {
  return (
    <div
      ref={ref}
      className={`relative w-full max-w-[340px] rounded-[28px] bg-ink p-3 shadow-[0_40px_80px_-20px_rgba(31,27,22,0.45)] sm:max-w-[460px] sm:p-4 md:max-w-[560px] ${className}`}
      style={{ aspectRatio: "4 / 3", transformStyle: "preserve-3d", ...style }}
    >
      <div className="absolute top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--color-parchment)_35%,transparent)]" />
      <div
        className="flex h-full w-full items-center justify-center rounded-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-parchment) 14%, var(--color-ink)), var(--color-ink))",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </div>
  );
});
