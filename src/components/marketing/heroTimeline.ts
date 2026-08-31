import { buildScrubSafeSplashPreviewTimeline } from "@/components/shared/splashTimeline";

// Method-shorthand signatures (not arrow-function-valued properties) so TS
// checks these bivariantly against the real, stricter-typed gsap module --
// same convention as src/components/shared/splashTimeline.ts.
type GsapTimeline = {
  addLabel(name: string, position?: number | string): GsapTimeline;
  to(targets: unknown, vars: Record<string, unknown>, position?: number | string): GsapTimeline;
  fromTo(
    targets: unknown,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
    position?: number | string,
  ): GsapTimeline;
  set(targets: unknown, vars: Record<string, unknown>, position?: number | string): GsapTimeline;
  add(child: unknown, position?: number | string): GsapTimeline;
  duration(): number;
  kill(): void;
};
type GsapLike = {
  timeline(vars?: { paused?: boolean; onComplete?: () => void }): GsapTimeline;
  set(targets: unknown, vars: Record<string, unknown>): void;
};
type SplitTextInstance = { chars: unknown[]; revert: () => void };
type SplitTextCtor = new (target: Element, vars: { type: string }) => SplitTextInstance;

// Four staccato beats, disjoint fade windows only -- see the no-overlap note
// below. Holds get shorter through the sequence (staccato, building toward
// the payoff line rather than four evenly-paced beats).
const PHRASE_HOLD = [0.6, 0.5, 0.3]; // hold after phrase[0], phrase[1], phrase[2] -- none needed after the final phrase
const CROSSFADE_OUT = 0.3;
const CROSSFADE_IN = 0.3;
const PHRASE_TRAVEL_PX = 32;

// Where the splash preview starts, in the same abstract units as the text
// sequence -- a small offset from 0 rather than launching at the exact
// instant scroll begins, and NOT tied to any particular text label: the
// splash plays concurrently with the text intro (both "wake up" together),
// finishing on its own schedule (queried via .duration(), not hardcoded)
// rather than being pinned to a specific crossfade.
const SPLASH_START = 0.2;
const SPLASH_HANDOFF_CROSSFADE = 0.3;

// Cascade: 5 cards fall from scattered/elevated positions into their real
// grid layout, in the array's own authored order (greeting -> progress ->
// continue -> certificates -> ask-larder is the diagonal top-left ->
// bottom-right read) -- GSAP's plain numeric `stagger` over that order IS
// the diagonal feel, no grid-aware stagger config needed.
const CARD_FALL_DURATION = 0.5;
const CARD_STAGGER = 0.09;
const CARD_SCATTER: { x: number; y: number; rotate: number; scale: number }[] = [
  { x: -4, y: -60, rotate: -6, scale: 0.94 }, // greeting
  { x: -16, y: -75, rotate: -12, scale: 0.9 }, // progress (falls from furthest/highest)
  { x: 14, y: -68, rotate: 10, scale: 0.9 }, // continue
  { x: -12, y: -58, rotate: -9, scale: 0.92 }, // certificates
  { x: 12, y: -64, rotate: 8, scale: 0.92 }, // ask-larder
];

export type HeroTimelineRefs = {
  phraseEls: [unknown, unknown, unknown, unknown]; // Training. / Onboarding. / Repeat. / Ask Larder.
  subheadEl: unknown;
  ipadEl: unknown;
  glowEl: unknown;
  splash: {
    traceEl: SVGPathElement;
    fillEl: Element;
    wordmarkEl: HTMLElement;
    rawGroupEl: unknown;
    idleGroupEl: unknown;
  };
  cardEls: [unknown, unknown, unknown, unknown, unknown]; // greeting / progress / continue / certificates / ask-larder
};

export type HeroTimelineOptions = {
  ipadStartRotateXDeg: number;
  ipadEndRotateXDeg: number;
  ipadTravelYPx: number;
};

/**
 * Block N2 — the marketing hero's single master timeline. Passed to
 * ScrollTrigger as its `animation` option (with `scrub`) so ScrollTrigger
 * drives every tween here via `.progress()`, forward and backward, instead
 * of MarketingHero hand-computing per-phase progress windows in `onUpdate`
 * (Stage 1's approach — fine for 2 elements, not for this much content).
 *
 * No-overlap invariant (the actual fix for a real bug found and fixed once
 * already this session — two headlines with overlapping opacity ranges
 * produced illegible double-exposed text): every phrase's fade-out window
 * and the next phrase's fade-in window are explicit, disjoint timeline
 * positions that touch at exactly one point, where both are already at
 * opacity 0. Never give a fade-in an explicit position that lands inside
 * the preceding fade-out's own [start, start+duration) range.
 */
export function buildHeroMasterTimeline(
  gsap: GsapLike,
  SplitTextCtor: SplitTextCtor,
  refs: HeroTimelineRefs,
  opts: HeroTimelineOptions,
): GsapTimeline {
  const timeline = gsap.timeline({ paused: true });
  const { phraseEls, subheadEl, ipadEl, glowEl, splash, cardEls } = refs;

  timeline.set(splash.idleGroupEl, { opacity: 0 }, 0);
  timeline.addLabel("splashStart", SPLASH_START);
  const { timeline: splashTl } = buildScrubSafeSplashPreviewTimeline(gsap, SplitTextCtor, {
    traceEl: splash.traceEl,
    fillEl: splash.fillEl,
    wordmarkEl: splash.wordmarkEl,
  });
  timeline.add(splashTl, "splashStart");
  // Crossfades the raw trace/fill/wordmark group to the plain idle
  // ChitMark right as the nested splash timeline finishes its own last
  // beat — queried via .duration() rather than a hand-copied hardcoded
  // number, so retiming buildSplashTimeline's own beats can't silently
  // desync this hand-off.
  const splashHandoffPosition = `splashStart+=${splashTl.duration()}`;
  timeline
    .to(splash.rawGroupEl, { opacity: 0, duration: SPLASH_HANDOFF_CROSSFADE }, splashHandoffPosition)
    .to(splash.idleGroupEl, { opacity: 1, duration: SPLASH_HANDOFF_CROSSFADE }, splashHandoffPosition);

  timeline.set(phraseEls[0], { opacity: 1, y: 0 }, 0);
  timeline.set([phraseEls[1], phraseEls[2], phraseEls[3]], { opacity: 0, y: PHRASE_TRAVEL_PX }, 0);
  timeline.set(subheadEl, { opacity: 0 }, 0);

  timeline.set(cardEls, { opacity: 0 }, 0);

  let cursor = 0;
  let cascadeStart = 0;
  timeline.addLabel("phrase0", cursor);
  cursor += PHRASE_HOLD[0];

  for (let i = 0; i < phraseEls.length - 1; i++) {
    timeline.addLabel(`cross${i + 1}`, cursor);
    timeline.to(phraseEls[i], { opacity: 0, y: -PHRASE_TRAVEL_PX, duration: CROSSFADE_OUT }, cursor);
    cursor += CROSSFADE_OUT;
    const isFinal = i + 1 === phraseEls.length - 1;
    timeline.to(phraseEls[i + 1], { opacity: 1, y: 0, duration: CROSSFADE_IN }, cursor);
    if (isFinal) {
      // Subhead and the bento cascade both start exactly when the final
      // phrase begins arriving -- the dashboard assembles as the payoff
      // line lands, per the reference's own timing.
      timeline.to(subheadEl, { opacity: 1, duration: CROSSFADE_IN }, cursor);
      cascadeStart = cursor;
    }
    cursor += CROSSFADE_IN;
    if (i + 1 < PHRASE_HOLD.length) cursor += PHRASE_HOLD[i + 1];
  }

  // The idle chit mark clears off-screen right as the cards start landing
  // on top of it, so the assembling dashboard doesn't read as cluttered
  // mid-cascade.
  timeline.to(splash.idleGroupEl, { opacity: 0, duration: 0.2 }, cascadeStart);

  timeline.addLabel("bentoCascade", cascadeStart);
  timeline.fromTo(
    cardEls,
    {
      opacity: 0,
      x: (i: number) => CARD_SCATTER[i].x,
      y: (i: number) => CARD_SCATTER[i].y,
      rotate: (i: number) => CARD_SCATTER[i].rotate,
      scale: (i: number) => CARD_SCATTER[i].scale,
    },
    {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      duration: CARD_FALL_DURATION,
      ease: "back.out(1.7)",
      stagger: CARD_STAGGER,
    },
    cascadeStart,
  );
  const cascadeEnd = cascadeStart + CARD_STAGGER * (cardEls.length - 1) + CARD_FALL_DURATION;

  const totalDuration = Math.max(cursor, cascadeEnd);

  // Continuous across the whole journey, added last at position 0 spanning
  // totalDuration -- the untilt reads as one slow, steady reveal underneath
  // the more discrete text beats, not synced to any single phase.
  timeline.to(
    ipadEl,
    { rotateX: opts.ipadEndRotateXDeg, y: -opts.ipadTravelYPx, ease: "none", duration: totalDuration },
    0,
  );
  timeline.to(glowEl, { y: -opts.ipadTravelYPx * 2.5, opacity: 0.8, ease: "none", duration: totalDuration }, 0);

  return timeline;
}
