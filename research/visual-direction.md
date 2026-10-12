# Larder promo video: visual direction in motion

Scope: Remotion, 1920x1080, 30fps, silent (no voiceover), calm and precise. Sources: CLAUDE.md Design system, `src/components/staff/Stamp.tsx`, `src/app/globals.css` (`stamp-settle`), `remotion/v2/brand.ts`, `fx.tsx`, `mark.tsx`, emil-design-eng skill, a short web scan (see end).

## 0. Flags and conflicts

1. Fraunces vs Space Grotesk: the brief says Fraunces; CLAUDE.md says Space Grotesk replaced it (Decision Log 31 Aug 2026). Use Space Grotesk (display), Inter (body), IBM Plex Mono (utility). `remotion/v2/fx.tsx` already loads exactly these. Flag to John; Notion Decision Log is authoritative.
2. The existing v2 helpers include effects this direction rejects: `Grain`, `Halftone`, `Vignette`, `DuotoneDefs`/`Broll` (duotone stock footage), and `BubbleReveal` filled with a solid colour. Stock b-roll also conflicts with the CLAUDE.md anti-pattern on stock imagery. Recommendation: stop using Grain, Halftone, Duotone and Broll. Keep Vignette only if it is nearly invisible (strength 0.18 max, optional). Keep `Cam`, `Plane` (with the shadow fix below), `Words` (with tuned spring), `Fade`.
3. `Plane` shadow uses pure black `rgba(0,0,0,..)`. Replace with Ink-tinted shadows (below) so shadows sit in the palette.
4. In-app Stamp today: two Preserve Red concentric circles (r46 stroke 3, r38 stroke 1.5, viewBox 100) with the word APPROVED in mono 11 and a 450ms `cubic-bezier(0.34,1.56,0.64,1)` scale .85 to 1.05 to 1. The video must reuse this geometry exactly (same SVG), only the motion is richer.
5. Mono font is only loaded at weight 500 in `fx.tsx`. Design below uses 500 only for mono.

## 1. Backgrounds: Ink vs Parchment

Principle: Parchment is the working surface (the product lives in Parchment, so screenshots look native there). Ink is for emotional and brand beats. Alternate by meaning, not by rhythm.

| Scene type | Background | Hex |
| --- | --- | --- |
| Open: the problem, the quiet hook | Ink | `#1F1B16` |
| Product walkthrough (staff flow, modules, Ask Larder, dashboard) | Parchment | `#F2E9D8` |
| Trust moments (Stamp scenes) | Parchment, with Ink text | `#F2E9D8` |
| Close: logo, one line, URL | Ink | `#1F1B16` |

Ratio target: about 20% Ink (open + close), 80% Parchment. Not 50/50, because Parchment with Ink shadows reads as calm and tactile, while a long dark run reads as "tech launch".

Surfaces on top of the background (no new colours, only mixes of the palette):
- Parchment page: flat `#F2E9D8`. Optional very soft vertical wash to `#EBE0CB` at the bottom (a mix of Parchment toward Clay at roughly 6%). Never a visible gradient.
- Ink page: flat `#1F1B16`. Optional lifted panel `#2A251F` (Ink mixed 8% toward Clay) for inset cards only.
- Hairlines: on Parchment `rgba(31,27,22,0.12)`; on Ink `rgba(242,233,216,0.14)`.

Transitions between Ink and Parchment (pick one family, use it every time):
- Primary: Ink-to-Parchment is a hard-edged horizontal wipe, a straight vertical edge sweeping left to right over 18 frames (0.6s), `easeWipe = bezier(0.7,0,0.2,1)`. The incoming scene is already settled behind the edge (no content animating while the edge moves).
- Same-background scene change: no wipe. Cross-dissolve 8 frames while the camera continues, or a hard cut on a click (preferred: cut on the action, as in a screen recording edit).
- The existing chit-bubble `BubbleReveal` may be used ONCE, at the open (Ink to Parchment), as the logo moment. The bubble shape is the brand; do not repeat it as a generic transition. Do not use it with Red fill (see section 2).
- No fade-through-black, no zoom-blur transitions, no glitch.

## 2. Red and Saffron: accents only

Rules:
- Red `#B23A2C`: only (a) The Stamp, (b) the cursor click ripple on the single most important click per scene, (c) one underline or one word highlight in a headline at most once per video, (d) a tiny status dot for "expiring" in the dashboard shot if the real UI shows it. Max 2% of any frame's pixels. No red screens, no red overlays, no red wipes.
- Saffron `#E8A93B`: short rule under a headline (matches the landing feature pages, a 48px by 4px rule), the cursor ring, and a single highlight on one data point. Max 2% of pixels. On Ink backgrounds Saffron is the preferred accent (contrast 8.3:1); on Parchment prefer Red for the Stamp and Saffron only as a fill behind Ink text (Saffron text on Parchment is 1.9:1, fails).
- Bay Green `#55603C`: only for "complete / compliant" states already in the UI. Do not add to the video chrome. Clay `#7A5C43`: secondary text and shadow tint on Parchment (contrast on Parchment ~4.7:1, OK for 28px+ only).
- Never red and saffron adjacent in one element (reads as ketchup and mustard).
- Texture: none. No grain, halftone, duotone, vignette-as-style, glow, bloom, lens flare, light leaks. Justified exception: none. Calm comes from flat colour, generous space and soft shadow.

Contrast checks (computed): Ink on Parchment 13.3:1; Parchment on Ink 13.3:1; Red on Parchment 4.9:1 (large text and graphics only); Saffron on Ink 8.3:1.

## 3. Type scale (1920x1080)

Safe margins: 96px left/right (5%), 54px top/bottom minimum; content grid 1728 x 972. Keep a consistent left edge at x=160 for left aligned scenes (headline block), centred scenes centre on x=960. Nothing important in the outer 5% (matches `SAFE_X/SAFE_Y` in brand.ts).

| Role | Font | Size | Weight | Line height | Tracking | Max line length | Colour |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hero headline (one per scene, max 8 words) | Space Grotesk | 96px | 700 | 1.04 (100px) | -0.02em (-1.9px) | 1280px, about 22 characters per line, max 2 lines | Ink on Parchment, Parchment on Ink |
| Large statement (closing line, full line) | Space Grotesk | 128px | 700 | 1.0 | -0.025em | 1500px, 1 to 2 lines | same |
| Subhead | Inter | 36px | 400 (500 for emphasis) | 1.35 (48px) | -0.005em | 900px, about 55 characters | Ink at 78% on Parchment (`rgba(31,27,22,0.78)`); Parchment at 80% on Ink |
| Caption (over a screenshot, annotation) | Inter | 26px | 500 | 1.4 | 0 | 560px, about 40 characters | Ink |
| Mono label (step names, dates, "RSA expires 14 Nov") | IBM Plex Mono | 22px | 500 | 1.3 | +0.08em, UPPERCASE for labels only | single line | Clay on Parchment, Parchment 70% on Ink |
| Mono micro (stamp ring text, UI annotations) | IBM Plex Mono | 18px minimum | 500 | 1.2 | +0.12em | single line | Red inside stamp |

Rules:
- Minimum 22px for anything meant to be read; 18px only for decoration that is also readable elsewhere. At 1080p on a laptop or phone, 26px is the floor for sentences.
- One headline per scene, shown for at least (word count / 3) + 1.2 seconds. Read time budget: 4 words = 2.5s, 8 words = 3.5s.
- Sentence case everywhere (Branding Kit). Plain verbs. Mono labels may be uppercase because they are utility, not sentences.
- Text motion: reveal by line (not by character), one axis only, translateY 24px to 0 plus opacity, stagger 5 frames per line. The existing `Words` rotate (3deg) and 0.55em travel: reduce to translateY 0.25em, no rotation, spring below.
- Spring for text: `{ damping: 26, stiffness: 170, mass: 0.8 }` (critically damped, no overshoot). Settle about 14 frames.
- Hold: nothing on screen should move while it is being read except the slow camera drift.

## 4. Screenshot and device framing

Use real captures only (existing `public-v2/clips` and `img`). No fabricated UI.

Frame recipe for a screenshot or clip (`Plane` replacement, "Surface"):
- Corner radius: 24px for full-size app captures (above 1000px wide); 16px for secondary captures (below 700px wide); 12px for small crops. iPad-style frame: 36px outer radius.
- Border: 1px inner hairline. On Parchment bg: `rgba(31,27,22,0.10)`. On Ink bg: `rgba(242,233,216,0.16)`. Apply as `box-shadow: 0 0 0 1px ...` (not `border`, so layout stays stable).
- No device bezel for web captures. For the iPad story (it is the delivery device) use one flat bezel: 18px thick, fill `#1F1B16`, outer radius 44px, inner radius 26px, 1px highlight `rgba(242,233,216,0.10)`. No camera dot, no reflections, no gloss.
- Shadow recipe (layered soft, Ink tinted), on Parchment:
  ```
  0 1px 1px rgba(31,27,22,0.06),
  0 4px 8px rgba(31,27,22,0.06),
  0 16px 32px rgba(31,27,22,0.08),
  0 40px 80px -12px rgba(31,27,22,0.16)
  ```
  On Ink backgrounds, shadows barely read, so use a lift instead: the same stack at about 2x opacity plus the Parchment hairline above (`0 0 0 1px rgba(242,233,216,0.16)`), and put the surface on `#2A251F` if it has transparent areas.
- Placement: single hero screenshot centred, width 1280 to 1440px (67% to 75% of frame), vertically centred with optical offset of -20px (slightly high). Headline above at y=150 or left column layout (headline 640px column at x=160, screenshot 1120px wide at right, bleeding off the right edge by up to 120px is allowed, but never off the bottom unless the camera is moving).
- Scale in: from scale 0.96 and translateY 28px with opacity 0 to rest, spring `{ damping: 28, stiffness: 140, mass: 0.9 }` (about 18 frames, no overshoot). Never from scale 0 (emil: nothing appears from nothing).
- Camera: one slow eased move per scene (existing `Cam`): scale 1.00 to 1.04 over the scene, translate under 24px. Use `easeInOut`. Zooms into UI detail: max scale 1.5 with the focused region centred; hold 1s before text.
- Perspective tilt (`rotY` in `Plane`): avoid. If used, max 4deg and only on a single "opening reveal". Flat, straight-on framing reads as precise.
- Two screenshots in one frame: max two, same radius, 40px gap, staggered 6 frames. Never overlapping cascades of three or more.
- Optional soft contact shadow under a floating surface: ellipse of `rgba(31,27,22,0.10)`, blur 40px, 80% of width, 24px below. Skip if the layered stack is already used.

## 5. The Stamp in motion

Use ONLY at: (1) module completion, (2) quiz pass or certificate verification, (3) e-signature confirmation. That is three scenes at most, one Stamp per scene, never as a transition, logo bug, background pattern or end card decoration. The close scene uses the LarderMark (bubble), not the Stamp.

Geometry: reuse `Stamp.tsx` exactly. SVG viewBox 100, outer ring r46 stroke 3, inner ring r38 stroke 1.5, mono text centred at y=55, colour Red `#B23A2C`. Size in video: 220px diameter (hero), 160px if it sits beside a UI element. Label text under ring from the real UI (e.g. "Module completed"), mono 22px, Ink. Ring text per trust moment: "COMPLETE" (module), "VERIFIED" (certificate/quiz), "SIGNED" (e-signature). Note `Stamp.tsx` hardcodes "APPROVED"; for the video make a local copy with a `word` prop and flag to John that the app may need the same per moment.

Animation, in frames at 30fps (0 = trigger frame, aligned to the sound thud):
1. Frames 0 to 9 (anticipation): none. The UI is already showing the action that earns it (last question answered, Sign pressed). Hold 6 frames after the click ripple before the stamp lands.
2. Land (frames 0 to 14): scale 1.4 to 1.0, rotation -9deg to -3deg (final resting tilt -3deg, like a real hand stamp), opacity 0 to 1 over the first 4 frames. Spring config: `{ damping: 15, stiffness: 260, mass: 0.7 }` (fast, one small overshoot to about 0.97 then settle at 1.0; settles in about 16 frames).
   ```ts
   const p = spring({ frame, fps: 30, config: { damping: 15, stiffness: 260, mass: 0.7 } });
   const scale = 1.4 - 0.4 * p;          // 1.4 -> 1.0
   const rot = -9 + 6 * p;               // -9deg -> -3deg
   const opacity = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
   ```
3. Ink press feel (frames 0 to 10): a ring-only "press" using stroke: outer ring stroke width 5 at frame 2, easing to 3 by frame 10; inner ring appears 2 frames later (feels like the stamp rim hits first). Fill: the disc interior gets `rgba(178,58,44,0.06)` for 6 frames then fades to 0 (ink pooling). No blur, no glow.
4. Imprint ripple (frames 2 to 18): one expanding circle, stroke 2px Red at 30% opacity, from r=46 to r=70 (in 100 unit viewBox terms), fading to 0, easeOut. One ring only. Optional but recommended.
5. Camera haptic (frames 0 to 8): translateY of the whole Cam wrapper by `[0, 6, -3, 2, -1, 0]` px across frames `[0,2,4,6,8,10]`, amplitude 6px at 1080p, y axis only (a press, not a shake). Combine with scale 1.000 to 1.006 and back. This is the "haptic" and must be barely noticeable. Disable it if the Stamp appears twice within 3 seconds.
6. Hold at least 1.2s with the Stamp still. Then the scene continues; the Stamp does not exit (it is covered by the scene change).
7. Reduced motion principle from the app (`animate-stamp` falls back to static) is not needed for a video.

Rotation consistency: use the same final tilt -3deg for all three Stamps in the video, so it feels like one hand and one stamp.

## 6. Cursor and click ripple

- Cursor: standard macOS-style arrow, 28px tall, fill Ink `#1F1B16`, 2px Parchment stroke (visible on both backgrounds), soft shadow `0 2px 4px rgba(31,27,22,0.30)`. On Ink backgrounds, invert: Parchment fill, Ink stroke.
- Movement: eased arcs, not straight lines. Duration 14 to 22 frames per move, `easeInOut` plus a 3 to 6% perpendicular bend (quadratic Bezier). Arrive 4 frames before click. Never faster than 600px per 10 frames.
- Press: cursor scale 1.0 to 0.92 over 3 frames, back to 1.0 over 6 frames. The target element presses scale 0.97 for 4 frames (emil: buttons must feel responsive).
- Click ripple: single ring, centre at cursor tip. Stroke 3px Saffron `#E8A93B` (on Parchment: Saffron ring over Ink-tinted dot is fine; if the ring sits on a light button use Red `#B23A2C` instead for contrast). Radius 8px to 44px over 14 frames, `easeOut`, opacity 0.9 to 0, no fill. One ring only, no double ripples.
- Use Red ripple for the one click per scene that leads to a Stamp; Saffron for all others. Max one ripple at a time.
- Typing: caret is Ink 2px by 0.9em, blink 15 frames on, 15 off (steady while typing). Characters appear at 2 frames each with natural variance, 4 to 8 frames after spaces and punctuation. Never type text longer than 60 characters on screen.
- Hover states: no cursor trails, no glow, no spotlight.

## 7. Anti-patterns checklist (reject at review)

| Anti-pattern | Rule |
| --- | --- |
| Cream plus terracotta | Never near `#F4F1EA` and `#D97757`. Larder Parchment is `#F2E9D8`, darker; pair with Ink, not terracotta. Verify no stray `#D97757`-like orange from shadows or gradients. |
| Numbered steps 01/02/03 | Not allowed unless the content is a genuine sequence (e.g. a real 3 step wizard, and then show the product's own step labels). |
| Generic checkmark or confetti | Never. Completion states use The Stamp only. No tick icons in circles, no success sparkles, no particle bursts. |
| Stock imagery (pantry, kitchen) | None in brand layer. Retire the duotone Broll stock footage. Real venue photos only when they appear inside module content in the product UI. |
| Fake UI | Only real recordings or screenshots from the app. |
| Dashes in copy | Zero hyphens, en dashes or em dashes in any on-screen text, including numeric ranges ("9am to 5pm"), placeholders ("None" not a dash), and standalone punctuation. Rewrite sentences; do not just swap in a comma. Allowed: genuine compound words (e-signature, self-serve, multi-tenant) and URLs/slugs. Check subtitles, captions, the file name label, and the end URL (only if the URL itself has none to type in the copy). Run a regex over all video copy strings: `/[-–—]/` and review each hit. |
| Stamp as decoration | Three uses only (section 5). |
| Red fill screens, red wipes | Banned. |
| Grain, halftone, duotone, glow | Banned (section 2). |
| Over-animation | Max one camera move and one text reveal per scene; no bouncing text; no whip pans; no speed ramps. |
| 90s TV shopping feel | Avoid: starbursts, price tags, shouty caps, multiple type colours, drop shadow text, sound stingers with whoosh, exclamation marks. |
| Voice | Plain verbs, sentence case, active voice, no filler, no apologies. "Complete module" button leads to "Module completed" confirmation. |
| Fraunces | Not used (replaced by Space Grotesk). |

## 8. Sound design (silent video, no voiceover)

Not appropriate: `remotion/public/indie-rock-food-review.mp3` (indie rock track, wrong tone, unknown licence, vocals/energy would break the calm). `remotion/audio` is empty, so no music or SFX assets exist. Recommendation: synthesise everything programmatically, no licensing risk, tiny files, deterministic.

Approach: a Node script `scripts/make-sfx.mjs` (suggested path, not created) writes 16 bit, 48kHz mono WAVs into `remotion/public-v2/audio/`, with no dependencies (build the buffer and header by hand). Then use Remotion `<Audio src={staticFile("audio/tick.wav")} volume={0.5} />` inside `<Sequence from={frame}>`, aligning to the cursor click frames. Cleanest: keep one `SFX_CUES` array of `{ frame, name, volume }` generated next to the animation timing constants so audio and visuals share the same frame numbers. Mix to roughly -16 LUFS overall; leave headroom (peak -3 dBFS) for platforms.

Sound palette (all short, soft, no reverb tails over 400ms):

| Cue | Synthesis recipe | Length | Level (peak) |
| --- | --- | --- | --- |
| Ambient bed | Pad of three sines at 110Hz, 164.8Hz (a fifth), 220Hz, each with slow LFO amplitude (0.05 to 0.12 Hz, depth 25%), lowpass at 900Hz (one pole), plus pink noise at -42 dB under it. Fade in 2s, out 2s. Loopable if a crossfade is applied. Keep it barely audible. | whole video | -24 dBFS |
| UI tick (tap/click) | 1.2kHz sine burst with exponential decay (time constant 12ms) plus 3ms white noise transient, highpassed at 2kHz. | 60ms | -14 dBFS |
| Soft select / hover-less transition | 600Hz sine, 40ms attack-less decay (t=25ms), pitched down 10% across duration. | 90ms | -18 dBFS |
| Key click (typing) | Noise burst 6ms bandpassed 2.5kHz plus a 180Hz sine thump decaying in 15ms. Randomise pitch +/-8% and gain +/-2dB per instance (generate 4 variants: key1..key4 and rotate). | 40ms | -20 dBFS |
| Wipe (Ink to Parchment) | Filtered noise swept lowpass 300Hz to 2.5kHz over 400ms with gain envelope up then down; very quiet. Or omit and let the bed carry. | 500ms | -22 dBFS |
| Stamp thud (trust moment) | Sine 90Hz dropping to 55Hz over 120ms (exponential pitch envelope), amplitude decay t=90ms; plus 8ms noise click lowpassed at 1.5kHz at the start (the "contact"); plus a tiny 900Hz paper-tap tick 30ms later at -26 dB. No reverb. Align the thud to the Stamp frame 0 (the moment of max scale-down contact, around frame 3 of the spring). | 350ms | -8 dBFS (loudest sound in the video) |
| Success (after the stamp, optional) | None. The thud is the reward. No chimes. | | |
| Close logo | Same soft select cue at -18 dBFS, then bed fades out over 2s. | | |

Guidelines:
- Silence is part of the design: leave 400ms gaps; at most two cues within any 10 frames.
- No whooshes, risers, stingers, or music beats. Calm.
- Randomise within small ranges so repeated ticks do not sound machine-gun.
- Provide a muted-friendly cut: all meaning must work without sound (social autoplay).
- Remotion detail: use `<Audio>` per cue with `startFrom`/`endAt` trims if needed, `volume` as a callback for fade of the bed: `volume={(f) => interpolate(f, [0, 60, total-60, total], [0, 0.35, 0.35, 0], {extrapolateLeft:"clamp", extrapolateRight:"clamp"})}`.
- Mixing check: render once, run `ffmpeg -i out.mp4 -af loudnorm=print_format=summary -f null -` to confirm roughly -16 LUFS integrated, true peak below -1.5 dBTP.

## 9. Timing and spring reference (copy/paste)

```ts
// colours
export const C = { ink:"#1F1B16", parchment:"#F2E9D8", red:"#B23A2C", saffron:"#E8A93B", green:"#55603C", clay:"#7A5C43" };
// springs
export const SPRING_TEXT    = { damping: 26, stiffness: 170, mass: 0.8 };  // headline lines, no overshoot
export const SPRING_SURFACE = { damping: 28, stiffness: 140, mass: 0.9 };  // screenshots enter
export const SPRING_STAMP   = { damping: 15, stiffness: 260, mass: 0.7 };  // stamp land, one small overshoot
// easing
export const easeOut   = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeWipe  = Easing.bezier(0.7, 0, 0.2, 1);
```

Durations: text reveal 14 frames; surface enter 18 frames; wipe 18 frames; cross-dissolve 8 frames; cursor move 14 to 22 frames; click ripple 14 frames; stamp land 16 frames plus 10 frame camera press; camera drift whole scene. Exit animations are 60% of enter length (asymmetric, system responds fast).

## 10. Suggested scene colour plan (for the storyboard agent)

| Scene | Bg | Accent use |
| --- | --- | --- |
| Hook / problem statement | Ink | Saffron rule under headline |
| Logo reveal (bubble wipe, once) | Ink to Parchment | none (Ink bubble) |
| Role modules in staff flow | Parchment | Saffron ripple |
| Ask Larder chat (including supervisor fallback line) | Parchment | Saffron ripple |
| Module completion | Parchment | Red Stamp ("COMPLETE") |
| Certificate upload and verification | Parchment | Red Stamp ("VERIFIED") |
| E-signature | Parchment | Red Stamp ("SIGNED") |
| Owner dashboard and approval gate | Parchment | Bay Green status from UI, one Saffron highlight |
| Close: mark, one line, URL | Ink | Saffron rule |

## Sources (web scan, thin on shadow and framing specifics)
- Forrester motion principles: https://www.forrester.com/brand/design-system/motion (text line by line, one axis, hold long enough, limit transformations)
- Launch video guidance: https://motion.so/learn/apple-style-product-launch-video (restrained, product-led, no fake UI, no stock footage)
- emil-design-eng skill (project): easing, spring, no scale(0), asymmetric timing, under-300ms UI motion.
- Shadow and corner radius values above are this agent's own recommendations, not sourced.
