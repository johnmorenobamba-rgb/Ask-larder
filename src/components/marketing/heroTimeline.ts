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
const VIDEO_HANDOFF_CROSSFADE = 0.3;

export type HeroTimelineRefs = {
  phraseEls: [unknown, unknown, unknown, unknown]; // Training. / Onboarding. / Repeat. / Ask Larder.
  subheadEls: [unknown, unknown, unknown, unknown]; // one per phrase, crossfades in lockstep with it
  ipadEl: unknown;
  glowEl: unknown;
  splash: {
    traceEl: SVGPathElement;
    fillEl: Element;
    wordmarkEl: HTMLElement;
    rawGroupEl: unknown;
    idleGroupEl: unknown;
  };
  // Baked Remotion loop (HeroTileDrop) replacing the live GSAP tile-drop,
  // 5-6 Sep 2026 -- crossfades in once the cascade point is reached,
  // instead of tweening 4 separate card elements.
  videoWrapperEl: unknown;
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
 *
 * Returns `cascadeProgress` alongside the timeline (5-6 Sep 2026, baked
 * video rebuild) -- the caller needs this as a plain number, not just a
 * GSAP position label, to know when ScrollTrigger's own `self.progress`
 * (0-1 over the whole pin) has crossed into "video revealed" territory,
 * since starting/stopping `<video>` playback happens outside GSAP
 * entirely (a real DOM element's `.play()`/`.pause()`, not a tween).
 */
export function buildHeroMasterTimeline(
  gsap: GsapLike,
  SplitTextCtor: SplitTextCtor,
  refs: HeroTimelineRefs,
  opts: HeroTimelineOptions,
): { timeline: GsapTimeline; cascadeProgress: number } {
  const timeline = gsap.timeline({ paused: true });
  const { phraseEls, subheadEls, ipadEl, glowEl, splash, videoWrapperEl } = refs;

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
  // Each phrase carries its own one-line subhead, crossfading in lockstep
  // with it -- previously only the final phrase ("Ask Larder.") had
  // supporting copy underneath, so "Training."/"Onboarding."/"Repeat." read
  // as bare words with nothing explaining them until the payoff line.
  timeline.set(subheadEls[0], { opacity: 1 }, 0);
  timeline.set([subheadEls[1], subheadEls[2], subheadEls[3]], { opacity: 0 }, 0);

  timeline.set(videoWrapperEl, { opacity: 0 }, 0);

  let cursor = 0;
  let cascadeStart = 0;
  timeline.addLabel("phrase0", cursor);
  cursor += PHRASE_HOLD[0];

  for (let i = 0; i < phraseEls.length - 1; i++) {
    timeline.addLabel(`cross${i + 1}`, cursor);
    timeline.to(phraseEls[i], { opacity: 0, y: -PHRASE_TRAVEL_PX, duration: CROSSFADE_OUT }, cursor);
    timeline.to(subheadEls[i], { opacity: 0, duration: CROSSFADE_OUT }, cursor);
    cursor += CROSSFADE_OUT;
    const isFinal = i + 1 === phraseEls.length - 1;
    timeline.to(phraseEls[i + 1], { opacity: 1, y: 0, duration: CROSSFADE_IN }, cursor);
    timeline.to(subheadEls[i + 1], { opacity: 1, duration: CROSSFADE_IN }, cursor);
    if (isFinal) {
      // The baked tile-drop video starts exactly when the final phrase
      // begins arriving -- the dashboard "assembles" as the payoff line
      // lands, per the reference's own timing (unchanged from the live
      // GSAP cascade this replaced).
      cascadeStart = cursor;
    }
    cursor += CROSSFADE_IN;
    if (i + 1 < PHRASE_HOLD.length) cursor += PHRASE_HOLD[i + 1];
  }

  // The idle chit mark clears off-screen right as the video crossfades
  // in on top of it, so the reveal doesn't briefly show both at once.
  timeline.to(splash.idleGroupEl, { opacity: 0, duration: VIDEO_HANDOFF_CROSSFADE }, cascadeStart);
  timeline.addLabel("videoReveal", cascadeStart);
  timeline.to(videoWrapperEl, { opacity: 1, duration: VIDEO_HANDOFF_CROSSFADE }, cascadeStart);

  const totalDuration = cursor;

  // Continuous across the whole journey, added last at position 0 spanning
  // totalDuration -- the untilt reads as one slow, steady reveal underneath
  // the more discrete text beats, not synced to any single phase.
  timeline.to(
    ipadEl,
    { rotateX: opts.ipadEndRotateXDeg, y: -opts.ipadTravelYPx, ease: "none", duration: totalDuration },
    0,
  );
  timeline.to(glowEl, { y: -opts.ipadTravelYPx * 2.5, opacity: 0.8, ease: "none", duration: totalDuration }, 0);

  return { timeline, cascadeProgress: cascadeStart / totalDuration };
}
