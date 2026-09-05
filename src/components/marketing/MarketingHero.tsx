"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { IpadMockup } from "./IpadMockup";
import { HeroSplashPreview, type HeroSplashPreviewHandle } from "./HeroSplashPreview";
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
// One supporting line per phrase, crossfading in lockstep with it (5 Sep
// 2026 feedback -- the intro phrases used to read as bare words with no
// explanation until the final payoff line). The final phrase keeps its
// original two-sentence subhead; the intro three are short and single-line.
const SUBHEADS = [
  "The same training, every hire.",
  "Modules, certs, and questions, all in one place.",
  "New hire twelve gets what new hire one got.",
  "Built from your venue's own way of doing things. Training your staff can actually use on shift.",
] as const;
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
  const subheadElsRef = useRef<(HTMLElement | null)[]>([null, null, null, null]);
  const ipadRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const splashRef = useRef<HeroSplashPreviewHandle | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
      if (!splash) return;

      const { timeline: masterTimeline, cascadeProgress } = buildHeroMasterTimeline(
        gsap,
        SplitText,
        {
          phraseEls: phraseElsRef.current as [unknown, unknown, unknown, unknown],
          subheadEls: subheadElsRef.current as [unknown, unknown, unknown, unknown],
          ipadEl: ipadRef.current,
          glowEl: glowRef.current,
          splash: {
            traceEl: splash.traceEl!,
            fillEl: splash.fillEl!,
            wordmarkEl: splash.wordmarkEl!,
            rawGroupEl: splash.rawGroupEl,
            idleGroupEl: splash.idleGroupEl,
          },
          videoWrapperEl: videoRef.current,
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
          // The baked video isn't a GSAP tween -- it's a real <video>
          // element's own playback, started/stopped here based on
          // whichever side of cascadeProgress the scrub currently sits on,
          // idempotent so this doesn't call play()/pause() every tick.
          const video = videoRef.current;
          if (!video) return;
          if (self.progress >= cascadeProgress && video.paused) {
            video.play().catch(() => {});
          } else if (self.progress < cascadeProgress && !video.paused) {
            video.pause();
          }
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
      {/* min-h-screen only from md up (not on mobile/tablet) -- forcing a
          full 100vh floor when the mobile-compact content naturally sits
          around half that just relocates the same dead space around
          (centered = split top/bottom, top-aligned = all at the bottom);
          no amount of gap/sizing closes that gap gracefully. Since the
          body background is parchment everywhere, a shorter natural pin
          height on mobile reads as seamless, not broken -- the section
          still gets pinned/scrubbed for PIN_VH_MOBILE's scroll distance,
          just without artificially inflating its own box past what its
          content needs (5 Sep 2026 feedback: real screenshots on a phone
          showing large empty bands above and below the pinned content).
          md+'s side-by-side 2-column layout already filled a full screen
          naturally, so it keeps min-h-screen + items-center unchanged. */}
      <section
        ref={sectionRef}
        className="relative flex items-start overflow-hidden bg-parchment px-6 pt-10 pb-6 sm:px-10 sm:pt-16 sm:pb-16 md:min-h-screen md:items-center md:px-16 md:py-24"
      >
        {/* Row gap on mobile (stacked, single column) must clear the ipad's
            own IPAD_TRAVEL_Y_PX upward drift (48px, via GSAP's `y` tween on
            ipadEl below) or the landed tablet visually overlaps the button
            row above it once scrubbed to the end of the pin. */}
        <div className="mx-auto grid w-full max-w-7xl items-start gap-10 sm:gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <div className="relative">
            <p className="mb-2 font-mono text-xs tracking-[0.2em] text-clay-brown uppercase sm:mb-4 md:mb-6">
              For independent hospitality venues
            </p>
            {/* Fixed rem heights, not em -- em here would resolve against the
                container's own inherited font-size, not each absolutely-
                positioned phrase's much larger one. Sized generously enough
                for the largest phrase to wrap to 2 lines at each breakpoint.
                Mobile is deliberately compact (smaller min-height + smaller
                type) -- this whole section is pinned during its scroll-
                scrubbed animation, so the headline/subhead/buttons/tablet all
                need to actually fit in one screen on a phone, or the pinned
                frame the user scrubs through never shows the tablet at all. */}
            <div className="relative min-h-[4.5rem] sm:min-h-[10rem] md:min-h-[13rem]">
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
                        ? "font-display absolute inset-0 text-4xl leading-[1.05] font-bold text-ink sm:text-7xl md:text-8xl"
                        : "font-display absolute inset-0 text-3xl leading-[1.05] font-bold text-ink sm:text-6xl md:text-7xl"
                    }
                    style={reducedMotion ? { opacity: isFinal ? 1 : 0 } : { opacity: i === 0 ? 1 : 0 }}
                  >
                    {/* "Larder" gets the deliberate color moment on the payoff line —
                        Preserve Red carries the brand's "bold & energetic" personality,
                        used here, not everywhere, per the Branding Kit's own restraint rule. */}
                    {isFinal ? (
                      <>
                        Ask <span className="text-preserve-red">Larder.</span>
                      </>
                    ) : (
                      text
                    )}
                  </Tag>
                );
              })}
            </div>
            {/* One subhead per phrase (min-h fits the longest -- the final
                phrase's two-sentence line), crossfading in lockstep with its
                phrase via buildHeroMasterTimeline's subheadEls array. */}
            <div className="relative mt-2 min-h-[2.5rem] max-w-md sm:mt-6 sm:min-h-[3.5rem] md:mt-8">
              {SUBHEADS.map((text, i) => (
                <p
                  key={text}
                  data-hero-subhead={PHRASE_KEYS[i]}
                  ref={(el: HTMLElement | null) => {
                    subheadElsRef.current[i] = el;
                  }}
                  className="absolute inset-x-0 top-0 text-sm text-ink/80 sm:text-lg"
                  style={reducedMotion ? { opacity: i === PHRASES.length - 1 ? 1 : 0 } : { opacity: i === 0 ? 1 : 0 }}
                >
                  {text}
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 sm:mt-6 sm:gap-4 md:mt-8">
              <a
                href="#contact"
                className="rounded-full bg-ink px-5 py-2 font-sans text-xs font-medium text-parchment transition-colors hover:bg-ink/90 sm:px-7 sm:py-3 sm:text-sm"
              >
                Get started
              </a>
              <a
                href="#feature-guide"
                className="rounded-full border border-ink/20 px-5 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-ink/5 sm:px-7 sm:py-3 sm:text-sm"
              >
                Learn more
              </a>
            </div>
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
                {/* Baked Remotion loop (HeroTileDrop), 5-6 Sep 2026 --
                    replaces the live GSAP tile-drop per John's explicit
                    direction, accepting the tradeoff that it no longer
                    scrubs 1:1 with scroll once revealed; it plays/loops on
                    its own instead, started/stopped by progress in the
                    ScrollTrigger onUpdate above. Reduced motion shows the
                    same render's own settled-frame poster as a static
                    image instead of an autoplaying video -- motion-
                    sensitive users get the endpoint, not the loop. */}
                {reducedMotion ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static asset, no benefit from next/image inside this 3D-transformed mockup
                  <img
                    src="/videos/hero-tile-drop-poster.png"
                    alt=""
                    className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src="/videos/hero-tile-drop.mp4"
                    poster="/videos/hero-tile-drop-poster.png"
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                    style={{ opacity: 0 }}
                  />
                )}
              </div>
            </IpadMockup>
          </div>
        </div>
      </section>
    </div>
  );
}
