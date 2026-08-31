"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { IpadMockup } from "./IpadMockup";
import { HeroSplashPreview, type HeroSplashPreviewHandle } from "./HeroSplashPreview";
import { HeroBentoPreview, type HeroBentoPreviewHandle } from "./HeroBentoPreview";
import { buildHeroMasterTimeline } from "./heroTimeline";

// Block N1 — pin duration in viewport-heights. Grown substantially for N2's
// much richer sequence (4 text beats + splash + bento cascade vs. Stage 1's
// 2-phrase crossfade) -- a first-pass starting point, tuned against real
// scroll via scripts/verify-marketing-hero.ts, not a spec.
const PIN_VH_MOBILE = 2.2;
const PIN_VH_DESKTOP = 3.2;
const MOBILE_BREAKPOINT_PX = 768;

const IPAD_START_ROTATE_X_DEG = 46;
const IPAD_END_ROTATE_X_DEG = 12;
const IPAD_TRAVEL_Y_PX = 48;

const PHRASES = ["Training.", "Onboarding.", "Repeat.", "Ask Larder."] as const;
// Verification-only selector keys (scripts/verify-marketing-hero.ts) --
// stable regardless of copy changes to PHRASES' visible text.
const PHRASE_KEYS = ["training", "onboarding", "repeat", "ask-larder"] as const;

/**
 * Block N2 — Cinematic multi-phase hero (Decision Log direction, 31 Aug
 * 2026 session). Pins the hero while ONE master GSAP timeline
 * (heroTimeline.ts's buildHeroMasterTimeline) plays out, scrubbed to real
 * scroll via ScrollTrigger's `animation` option — replaces Stage 1's
 * hand-rolled per-frame `gsap.set()` calls inside `onUpdate`, which doesn't
 * scale past 2 simple crossfading elements.
 *
 * `pin: true` + the plain non-flex wrapper `<div>` around `<section>` are
 * unchanged from Stage 1 — GSAP's pin-spacer silently fails to grow when
 * the pinned element is a direct flex child (confirmed via isolated repro
 * against this exact `<main class="flex ...">` ancestor in page.tsx). Do
 * not regress this.
 */
export function MarketingHero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  // A single stable array-ref, not an array of separate useRef() calls --
  // the latter would be a new array literal every render, which either
  // needs re-running the effect every render (defeats the point) or an
  // exhaustive-deps lint suppression papering over a real stale-closure
  // risk. This ref's own identity is stable across renders like any other.
  const phraseElsRef = useRef<(HTMLElement | null)[]>([null, null, null, null]);
  const subheadRef = useRef<HTMLParagraphElement | null>(null);
  const ipadRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const splashRef = useRef<HeroSplashPreviewHandle | null>(null);
  const bentoRef = useRef<HeroBentoPreviewHandle | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;

    let cancelled = false;
    let trigger: { kill: () => void } | undefined;

    import("gsap").then(async ({ default: gsap }) => {
      if (cancelled) return;
      // No DrawSVG/MorphSVG here — heroTimeline.ts's splash preview uses
      // buildScrubSafeSplashPreviewTimeline (splashTimeline.ts), which
      // deliberately avoids those two plugins (confirmed via isolated
      // repro: their tweens never apply under `.progress()`-driven scrub,
      // only under normal ticker playback). Only SplitText is still needed
      // here, for the wordmark character stagger.
      const [{ ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      gsap.registerPlugin(ScrollTrigger, SplitText);
      if (cancelled) return;
      const splash = splashRef.current;
      const bento = bentoRef.current;
      if (!splash || !bento) return;

      const masterTimeline = buildHeroMasterTimeline(
        gsap,
        SplitText,
        {
          phraseEls: phraseElsRef.current as [unknown, unknown, unknown, unknown],
          subheadEl: subheadRef.current,
          ipadEl: ipadRef.current,
          glowEl: glowRef.current,
          splash: {
            traceEl: splash.traceEl!,
            fillEl: splash.fillEl!,
            wordmarkEl: splash.wordmarkEl!,
            rawGroupEl: splash.rawGroupEl,
            idleGroupEl: splash.idleGroupEl,
          },
          cardEls: bento.cardEls,
        },
        {
          ipadStartRotateXDeg: IPAD_START_ROTATE_X_DEG,
          ipadEndRotateXDeg: IPAD_END_ROTATE_X_DEG,
          ipadTravelYPx: IPAD_TRAVEL_Y_PX,
        },
      );

      // masterTimeline is built via a loose structural type (see
      // heroTimeline.ts), deliberately narrower than gsap's own real
      // Timeline type — same "no static gsap type import" convention as
      // splashTimeline.ts. Cast through ScrollTrigger.create's own
      // parameter type (derived from this actual dynamic import, not a
      // named gsap.core.* type) rather than reaching for `any`.
      type ScrollTriggerVars = Parameters<typeof ScrollTrigger.create>[0];
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => {
          const vh = window.innerHeight * (window.innerWidth < MOBILE_BREAKPOINT_PX ? PIN_VH_MOBILE : PIN_VH_DESKTOP);
          return `+=${vh}`;
        },
        pin: true,
        scrub: 1,
        animation: masterTimeline as unknown as ScrollTriggerVars["animation"],
        // Verification-only, no visual effect — lets
        // scripts/verify-marketing-hero.ts poll-scroll to a target progress
        // value instead of guessing pixel amounts against PIN_VH_*, which
        // stays robust regardless of however those constants get tuned.
        onUpdate: (self) => {
          section.dataset.heroProgress = String(self.progress);
        },
      });
      // gsap loads via a post-mount dynamic import, well after the window
      // `load` event ScrollTrigger normally uses for its first automatic
      // measurement pass — an explicit refresh() here covers that miss.
      ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      trigger?.kill();
    };
  }, [reducedMotion]);

  return (
    <div>
      <section
        ref={sectionRef}
        className="relative flex min-h-screen items-center overflow-hidden bg-parchment px-6 py-24 sm:px-10 md:px-16"
      >
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 md:grid-cols-2 md:gap-12">
          <div className="relative">
            <p className="mb-6 font-mono text-xs tracking-[0.2em] text-clay-brown uppercase">
              For independent hospitality venues
            </p>
            <div className="relative min-h-[3.5em] sm:min-h-[2.4em]">
              {PHRASES.map((text, i) => {
                const isFinal = i === PHRASES.length - 1;
                const Tag = isFinal ? "h1" : "p";
                return (
                  <Tag
                    key={text}
                    data-hero-phrase={PHRASE_KEYS[i]}
                    ref={(el: HTMLElement | null) => {
                      phraseElsRef.current[i] = el;
                    }}
                    className={
                      isFinal
                        ? "font-display absolute inset-0 text-5xl leading-[1.05] font-bold text-ink sm:text-6xl"
                        : "font-display absolute inset-0 text-4xl leading-[1.05] font-bold text-ink sm:text-5xl"
                    }
                    style={reducedMotion ? { opacity: isFinal ? 1 : 0 } : { opacity: i === 0 ? 1 : 0 }}
                  >
                    {text}
                  </Tag>
                );
              })}
            </div>
            <p
              ref={subheadRef}
              className="mt-8 max-w-md text-lg text-ink/80"
              style={{ opacity: reducedMotion ? 1 : 0 }}
            >
              Built from your venue&apos;s own way of doing things — training your staff can actually use on shift.
            </p>
          </div>

          <div className="relative flex justify-center" style={{ perspective: 1400 }}>
            <div
              ref={glowRef}
              aria-hidden="true"
              className="absolute -inset-16 -z-10 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--color-saffron) 35%, transparent), transparent 70%)",
                opacity: reducedMotion ? 0.8 : 0.5,
              }}
            />
            <IpadMockup
              ref={ipadRef}
              style={{
                transform: `perspective(1400px) rotateX(${reducedMotion ? IPAD_END_ROTATE_X_DEG : IPAD_START_ROTATE_X_DEG}deg)`,
              }}
            >
              <div className="relative flex h-full w-full items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                <HeroSplashPreview ref={splashRef} />
                <div className="absolute inset-0">
                  <HeroBentoPreview ref={bentoRef} />
                </div>
              </div>
            </IpadMockup>
          </div>
        </div>
      </section>
    </div>
  );
}
