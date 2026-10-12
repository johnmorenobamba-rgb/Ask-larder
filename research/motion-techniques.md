# Remotion motion techniques for the Larder promo (4.0.520, 1920x1080, 30fps)

All code below is plain TypeScript/React, deterministic (every value is a pure function of `useCurrentFrame()`), and uses only packages already installed. It reuses `C`, `W`, `H`, `FONT_*`, `easeOut`, `easeInOut` from `remotion/v2/brand.ts` and matches the style of `remotion/v2/fx.tsx` (`Cam`, `Words`, `Plane`, `Fade`).

Nothing here was rendered; it was written against the Remotion 4 API and the existing helpers. Run one still per snippet (see section 7) before relying on it.

## 0. What is installed (no install needed)

`node_modules/@remotion` contains: bundler, canvas, captions, cli, compositor-win32-x64-msvc, fonts, licensing, media, media-parser, media-utils, player, renderer, streaming, studio, studio-codemods, studio-protocol, studio-server, studio-shared, tailwind-v4, timeline-utils, web-renderer, zod-types.

NOT installed: `@remotion/transitions`, `@remotion/shapes`, `@remotion/effects`, `@remotion/motion-blur`, `@remotion/noise`, `@remotion/paths`, `@remotion/layout-utils`. package.json only declares cli, fonts, media-utils, tailwind-v4, remotion. So:

- Scene transitions: hand roll with overlapping `<Sequence>` (section 5). If you later allow an install: `npx remotion add @remotion/transitions` (it pins to the matching 4.0.520), then `TransitionSeries` + `fade()/slide()/wipe()` + `springTiming`.
- Shapes: write inline SVG (the bubble path in brand.ts already does this).
- Motion blur: fake with a directional `filter: blur()` scaled by velocity (section 5.4), or `@remotion/motion-blur` `<CameraMotionBlur>` if installed (it multiplies render time by sample count, avoid).
- `random` from `remotion` is deterministic (seeded); use it, never `Math.random()`.

## 1. Spring and easing presets that feel calm

`spring()` returns 0 to 1 (overshoots if underdamped). Use these named configs everywhere so the video has one motion personality.

```ts
// remotion/v2/motion.ts  (new file, optional)
import { Easing, interpolate, spring, SpringConfig } from "remotion";

export const SPRING = {
  // calm, no overshoot, the default for text and cards. settles in about 28 frames
  calm:   { damping: 26, stiffness: 120, mass: 1 } as Partial<SpringConfig>,
  // slightly quicker, still no bounce, for UI elements arriving
  soft:   { damping: 22, stiffness: 170, mass: 0.9 } as Partial<SpringConfig>,
  // camera: heavy and slow, feels like a dolly. settles in about 45 frames
  camera: { damping: 34, stiffness: 70, mass: 1.4 } as Partial<SpringConfig>,
  // tiny overshoot for the Stamp or a button press release (one gentle bounce)
  pop:    { damping: 14, stiffness: 170, mass: 0.8 } as Partial<SpringConfig>,
  // never use: damping below 10 reads cartoonish, stiffness above 300 reads twitchy
} as const;

// bezier alternatives when you need an exact duration (springs have a tail)
export const EASE = {
  out:   Easing.bezier(0.22, 1, 0.36, 1),   // expo-ish out, for entrances
  inOut: Easing.bezier(0.65, 0, 0.35, 1),   // for camera and cursor
  soft:  Easing.bezier(0.33, 1, 0.68, 1),   // cubic out, gentler
};

/** Spring with a hard end: stretches the natural spring to exactly `durationInFrames`. */
export const springTo = (frame: number, fps: number, delay: number, durationInFrames: number, config = SPRING.calm) =>
  spring({ frame: frame - delay, fps, config, durationInFrames, durationRestThreshold: 0.001 });
```

Rules of thumb: damping/(2*sqrt(stiffness*mass)) above about 0.9 means no overshoot. Passing `durationInFrames` to `spring()` rescales the whole curve so the animation ends exactly there (good for syncing to VO beats). Preview a spring at remotion.dev/timing-editor.

Avoid linear motion: always feed `interpolate()` an `easing`, or run it off a spring value `p` and map `p` with `interpolate(p, [0,1], [a,b])` (no easing needed on top).

## 2. Camera moves

Idea: wrap the whole screen in one `div` with `transform-origin: 0 0`. Then the math is exact. To put a normalised target point `(tx, ty)` (0..1 of the stage) at a screen anchor `(ax, ay)` (default centre) at zoom `s`:

```
translateX = ax*W - s*tx*W
translateY = ay*H - s*ty*H
transform  = translate(translateX, translateY) scale(s)     // origin 0 0
```

`s = 1` with target = anchor gives translate 0, so "pulled back, whole screen visible" is simply `{ s: 1, tx: 0.5, ty: 0.5 }`.

Interpolating `s` and translation with the same progress is fine for short moves. For a long zoom where the target must travel in a straight line, interpolate `log(s)` (done below via `Math.exp`), which gives constant perceived zoom speed.

```tsx
// remotion/v2/camera.tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { H, W } from "./brand";
import { SPRING } from "./motion";

export type CamKey = {
  at: number;            // scene relative frame the move STARTS
  dur?: number;          // optional hard duration in frames (stretches the spring)
  s: number;             // zoom, 1 = whole stage
  tx: number;            // normalised target x on the stage (0..1)
  ty: number;            // normalised target y on the stage (0..1)
  ax?: number;           // where on screen the target lands (default 0.5)
  ay?: number;
};

const resolve = (k: CamKey) => {
  const ax = k.ax ?? 0.5, ay = k.ay ?? 0.5;
  return { s: k.s, x: ax * W - k.s * k.tx * W, y: ay * H - k.s * k.ty * H };
};

/**
 * Chain of camera moves. keys[0] is the resting pose at frame 0 (its `at` is ignored).
 * Each following key is reached with a camera spring starting at its `at`.
 *
 * <Camera keys={[
 *   { at: 0, s: 1, tx: .5, ty: .5 },                                   // whole screen
 *   { at: 40, s: 2.2, tx: .72, ty: .31 },                              // push in to the chat box
 *   { at: 150, dur: 40, s: 1, tx: .5, ty: .5 },                        // pull back reveal
 * ]}>
 */
export const Camera: React.FC<{ keys: CamKey[]; children: React.ReactNode }> = ({ keys, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let cur = resolve(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const next = resolve(k);
    const p = spring({
      frame: frame - k.at, fps, config: SPRING.camera,
      ...(k.dur ? { durationInFrames: k.dur } : {}),
    });
    // log space zoom so the speed of the zoom feels constant
    const s = Math.exp(interpolate(p, [0, 1], [Math.log(cur.s), Math.log(next.s)]));
    // keep the TARGET point on a straight path: derive translate from s, not from lerping x/y
    const prevKey = keys[i - 1], ax0 = prevKey.ax ?? 0.5, ay0 = prevKey.ay ?? 0.5;
    const ax1 = k.ax ?? 0.5, ay1 = k.ay ?? 0.5;
    const tx = interpolate(p, [0, 1], [prevKey.tx, k.tx]);
    const ty = interpolate(p, [0, 1], [prevKey.ty, k.ty]);
    const ax = interpolate(p, [0, 1], [ax0, ax1]);
    const ay = interpolate(p, [0, 1], [ay0, ay1]);
    cur = { s, x: ax * W - s * tx * W, y: ay * H - s * ty * H };
    if (frame < k.at) break;          // later keys have not started
  }
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${cur.x}px, ${cur.y}px) scale(${cur.s})`, willChange: "transform" }}>
      {children}
    </AbsoluteFill>
  );
};
```

Note on the loop: once a later key has finished (p = 1) `cur` equals its resolved pose, so the next key starts from the right place. `frame < k.at` breaks early so unstarted keys never overwrite `cur`.

Push-in that lands exactly on a UI element: measure it once at design time, store as fractions of the 1920x1080 stage: `tx = (el.x + el.w/2)/W`. Do not use `getBoundingClientRect` at render time unless you wrap it in `delayRender` (it is deterministic, but scale transforms change the rect; measure with the camera at identity).

Scale-up softness: a 2.5x push-in on a 1920 wide screenshot will be blurry. Either record/screenshot at 2x (3840 wide) and display it at 1920 CSS px (`width: 1920`), or render the product UI as live React at CSS size and scale it (stays vector crisp). Check with `npx remotion still` at the max zoom frame.

Subtle "always moving" drift for held shots (no abrupt stillness):

```tsx
export const useDrift = (amp = 6, period = 240) => {
  const f = useCurrentFrame();
  return { x: Math.sin((f / period) * Math.PI * 2) * amp, y: Math.cos((f / (period * 1.3)) * Math.PI * 2) * amp * 0.6 };
};
```

## 3. Typing effect

### 3.1 Deterministic blinking cursor

```tsx
// remotion/v2/typing.tsx
import React from "react";
import { random, useCurrentFrame } from "remotion";
import { C, FONT_BODY } from "./brand";

/** On/off from the frame number only. 16 frames per half cycle at 30fps is about 0.53s. */
export const useBlink = (frame: number, half = 16, solidWhile = false) => (solidWhile ? true : Math.floor(frame / half) % 2 === 0);

export const Caret: React.FC<{ on: boolean; height: number; color?: string; width?: number }> = ({ on, height, color = C.ink, width = 3 }) => (
  <span style={{ display: "inline-block", width, height, marginLeft: 2, verticalAlign: "text-bottom", background: color, opacity: on ? 1 : 0, borderRadius: 1 }} />
);
```

### 3.2 Fixed rate typing (string slicing)

```tsx
export const Typed: React.FC<{ text: string; start: number; cps?: number; size: number; color?: string; font?: string; showCaretAfter?: boolean }> = ({
  text, start, cps = 22, size, color = C.ink, font = FONT_BODY, showCaretAfter = true,
}) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const chars = Math.max(0, Math.min(text.length, Math.floor(((frame - start) / fps) * cps)));
  const typing = frame >= start && chars < text.length;
  // solid while typing, blink when idle (like a real caret). before start: blink.
  const on = typing ? true : Math.floor(frame / 16) % 2 === 0;
  return (
    <span style={{ fontFamily: font, fontSize: size, color, whiteSpace: "pre-wrap" }}>
      {text.slice(0, chars)}
      {(showCaretAfter || typing) && <Caret on={on} height={size * 1.05} color={color} />}
    </span>
  );
};
```

### 3.3 Human pacing (variable delays, still deterministic)

Precompute a cumulative time per character from seeded randomness. Pause longer after spaces and punctuation, with small jitter.

```tsx
const charDelays = (text: string, seed: string, base = 2.0 /* frames per char */) => {
  const t: number[] = [];
  let acc = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const jitter = 0.55 + random(`${seed}-${i}`) * 0.9;          // 0.55..1.45
    const pause = ch === " " ? 0.8 : ch === "," ? 5 : ch === "." || ch === "?" ? 8 : 0;
    acc += base * jitter + pause;
    t.push(acc);
  }
  return t;     // t[i] = frame offset at which char i has appeared
};

export const TypedHuman: React.FC<{ text: string; start: number; seed?: string; size: number; color?: string; font?: string; base?: number }> = ({
  text, start, seed = "q", size, color = C.ink, font = FONT_BODY, base = 2.0,
}) => {
  const frame = useCurrentFrame();
  const t = React.useMemo(() => charDelays(text, seed, base), [text, seed, base]);
  const rel = frame - start;
  let chars = 0;
  while (chars < t.length && t[chars] <= rel) chars++;
  const typing = rel >= 0 && chars < text.length;
  const on = typing ? true : Math.floor(frame / 16) % 2 === 0;
  return (
    <span style={{ fontFamily: font, fontSize: size, color }}>
      {text.slice(0, chars)}<Caret on={on} height={size * 1.05} color={color} />
    </span>
  );
};
// total duration helper for Sequence length:  Math.ceil(charDelays(text, seed, base).at(-1)!) + 12
```

### 3.4 Streamed answer (chunk based, like an LLM)

Reveal by word chunks with variable cadence; each new chunk fades in so it reads as streaming rather than typing. The fade uses the chunk's own start frame.

```tsx
const chunkPlan = (text: string, seed: string) => {
  const words = text.split(" ");
  const chunks: { text: string; at: number }[] = [];
  let i = 0, acc = 0, n = 0;
  while (i < words.length) {
    const size = 1 + Math.floor(random(`${seed}-s${n}`) * 3);          // 1..3 words per chunk
    const slice = words.slice(i, i + size).join(" ");
    chunks.push({ text: slice, at: acc });
    // 2..5 frames between chunks, a longer beat after sentence ends
    acc += 2 + Math.floor(random(`${seed}-d${n}`) * 4) + (/[.?!]$/.test(slice) ? 8 : 0);
    i += size; n++;
  }
  return chunks;
};

export const Streamed: React.FC<{ text: string; start: number; seed?: string; size: number; color?: string; font?: string; lineHeight?: number }> = ({
  text, start, seed = "a", size, color = C.ink, font = FONT_BODY, lineHeight = 1.45,
}) => {
  const frame = useCurrentFrame();
  const plan = React.useMemo(() => chunkPlan(text, seed), [text, seed]);
  return (
    <div style={{ fontFamily: font, fontSize: size, lineHeight, color }}>
      {plan.map((c, i) => {
        const a = frame - start - c.at;
        if (a < 0) return null;                                   // not rendered yet, so the layout grows like a real stream
        const o = Math.min(1, a / 5);
        const y = (1 - Math.min(1, a / 8)) * size * 0.25;
        return <span key={i} style={{ display: "inline-block", opacity: o, transform: `translateY(${y}px)`, marginRight: "0.28em", filter: `blur(${(1 - o) * 3}px)` }}>{c.text}</span>;
      })}
    </div>
  );
};
```

Layout caveat: unrendered chunks do not reserve space, so text can re-wrap as it grows. If wrapping jitter is visible, render all chunks with `visibility:hidden` before they arrive instead of `return null` (keeps the final layout fixed). Use that for the final take.

## 4. Staggered text reveals (words and lines)

Reusable stagger with spring + blur + translate, supports per word or per line. Stagger of 3 to 5 frames reads premium; above 8 reads slow.

```tsx
// remotion/v2/reveal.tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING } from "./motion";

export const StaggerText: React.FC<{
  text: string; size: number; color: string; start?: number; stagger?: number;
  by?: "word" | "line"; font?: string; weight?: number; lineHeight?: number; maxWidth?: number;
  blur?: number; rise?: number; align?: "left" | "center";
}> = ({ text, size, color, start = 0, stagger = 4, by = "word", font, weight = 700, lineHeight = 1.05, maxWidth, blur = 14, rise = 0.5, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const units = by === "line" ? text.split("\n") : text.split(/\s+/);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", flexDirection: by === "line" ? "column" : "row", columnGap: size * 0.26, justifyContent: align === "center" ? "center" : "flex-start", textAlign: align, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, color, maxWidth, letterSpacing: "-0.015em" }}>
      {units.map((u, i) => {
        const p = spring({ frame: frame - start - i * stagger, fps, config: SPRING.calm });
        const o = interpolate(p, [0, 0.35, 1], [0, 1, 1]);
        return (
          <span key={i} style={{ display: "inline-block", opacity: o, filter: p < 0.999 ? `blur(${(1 - p) * blur}px)` : undefined, transform: `translateY(${(1 - p) * size * rise}px)`, willChange: "transform, opacity, filter" }}>
            {u}
          </span>
        );
      })}
    </div>
  );
};
```

Masked line rise (the "text coming up out of a slot" look, no blur cost): wrap each line in `overflow: hidden` with `padding-bottom: 0.12em`, translate the inner span from `110%` to `0%`.

```tsx
export const MaskLine: React.FC<{ children: React.ReactNode; start: number; size: number }> = ({ children, start, size }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: SPRING.calm });
  return (
    <div style={{ overflow: "hidden", paddingBottom: size * 0.14, marginBottom: -size * 0.14 }}>
      <div style={{ transform: `translateY(${(1 - p) * 110}%)` }}>{children}</div>
    </div>
  );
};
```

Exit: mirror it. Use `exitP = spring({frame: frame - exitStart, ...})` and multiply opacity by `1 - exitP`, or just fade the whole group over 8 frames.

## 5. Cursor along a path, click ripple, press-down

### 5.1 Path with eased segments and slight arc

Waypoints are in stage pixels (1920x1080). Each segment goes from the previous point to the next over `dur` frames starting at `at`, eased with `EASE.inOut`. A small perpendicular bulge makes it feel hand moved rather than ruler straight.

```tsx
// remotion/v2/cursor.tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "./brand";

export type Waypoint = { x: number; y: number; at: number; dur?: number; arc?: number; click?: boolean };
// at = frame this point is REACHED. dur = frames spent travelling to it (default 28). click = click on arrival.

const ease = Easing.bezier(0.45, 0, 0.2, 1);       // quick start, long settle, like a hand

export const cursorAt = (frame: number, pts: Waypoint[]) => {
  if (frame <= pts[0].at) return { x: pts[0].x, y: pts[0].y };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dur = b.dur ?? 28;
    const t0 = b.at - dur;
    if (frame < t0) return { x: a.x, y: a.y };                // waiting at previous point
    if (frame <= b.at) {
      const t = ease(Math.min(1, Math.max(0, (frame - t0) / dur)));
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const bulge = (b.arc ?? 0.06) * len * Math.sin(Math.PI * t);   // 0 at both ends
      return { x: a.x + dx * t + (-dy / len) * bulge, y: a.y + dy * t + (dx / len) * bulge };
    }
  }
  const l = pts[pts.length - 1];
  return { x: l.x, y: l.y };
};

/** 0 to 1 press depth for the target element: dips 6 frames then releases. */
export const pressAmount = (frame: number, clickAt: number) =>
  interpolate(frame, [clickAt - 2, clickAt + 2, clickAt + 9], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

/** Wrap the thing being clicked. */
export const Pressable: React.FC<{ clickAt: number; children: React.ReactNode; depth?: number; style?: React.CSSProperties }> = ({ clickAt, children, depth = 0.04, style }) => {
  const f = useCurrentFrame();
  const p = pressAmount(f, clickAt);
  return <div style={{ transform: `scale(${1 - depth * p})`, ...style }}>{children}</div>;
};

export const Ripple: React.FC<{ x: number; y: number; at: number; color?: string; size?: number }> = ({ x, y, at, color = C.saffron, size = 120 }) => {
  const f = useCurrentFrame();
  const a = f - at;
  if (a < 0 || a > 22) return null;
  const t = Easing.out(Easing.cubic)(a / 22);
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%", border: `3px solid ${color}`, opacity: 1 - t, transform: `scale(${0.2 + t * 1.1})`, pointerEvents: "none" }} />
  );
};

const ARROW = "M3 2 L3 22 L8.5 17 L12 25 L15.5 23.5 L12 15.8 L19 15.8 Z";   // classic pointer, tip at (3,2)

export const Cursor: React.FC<{ path: Waypoint[]; scale?: number }> = ({ path, scale = 2 }) => {
  const f = useCurrentFrame();
  const { x, y } = cursorAt(f, path);
  const clicks = path.filter((p) => p.click);
  const pressed = Math.max(0, ...clicks.map((c) => pressAmount(f, c.at)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {clicks.map((c, i) => <Ripple key={i} x={c.x} y={c.y} at={c.at} />)}
      <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32"
        style={{ position: "absolute", left: x - 3 * scale, top: y - 2 * scale, transform: `scale(${1 - 0.12 * pressed})`, transformOrigin: `${3 * scale}px ${2 * scale}px`, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))" }}>
        <path d={ARROW} fill={C.ink} stroke={C.parchment} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};
```

Usage: render `<Cursor>` INSIDE the `<Camera>` so it zooms with the screen and the ripple lands on the target. Wrap the button in `<Pressable clickAt={k.at}>` with the same frame number as the waypoint's `at`.

```tsx
const path: Waypoint[] = [
  { x: 1500, y: 900, at: 0 },                         // rest point, off to the side
  { x: 1180, y: 520, at: 48, dur: 34 },               // glide to the input
  { x: 1180, y: 520, at: 60, click: true, dur: 1 },   // dwell then click (dur 1 = stays; reuse same point)
  { x: 1620, y: 640, at: 150, dur: 30, click: true }, // move to the Send button and click
];
```

(Trick: to dwell, repeat the point with a later `at` and `dur: 1`.)

## 6. Depth, shadows, blur and transitions

### 6.1 Layered soft shadows (cheap and good)

Three stacked shadows beat one big blur: a tight contact shadow, a mid shadow, a long ambient one. Offsets grow with elevation. Keep total blur radius under about 120px (see performance).

```ts
export const elevation = (e = 1) => [
  `0 ${1 * e}px ${2 * e}px rgba(0,0,0,0.30)`,
  `0 ${8 * e}px ${20 * e}px rgba(0,0,0,0.28)`,
  `0 ${28 * e}px ${60 * e}px -${6 * e}px rgba(0,0,0,0.38)`,
  `0 0 0 1.5px rgba(242,233,216,0.14)`,         // hairline rim in parchment, reads as an edge on dark ink
].join(", ");
// animate e from 0.4 to 1 as a card "lifts": boxShadow: elevation(0.4 + 0.6*p), transform: translateY((1-p)*24px)
```

`Plane` in fx.tsx already does a variant. For real perspective keep `perspective()` inside the transform of the same element (as Plane does); avoid nested `preserve-3d` trees, they are slow and sometimes flicker in headless Chrome.

### 6.2 Parallax

Move layers by different amounts of the same camera value. With the Camera above, put layers in separate wrappers and give far layers a fraction of the move:

```tsx
export const Layer: React.FC<{ depth: number; cam: { s: number; x: number; y: number }; children: React.ReactNode }> = ({ depth, cam, children }) => (
  // depth 0 = pinned to screen, 1 = moves with the camera fully, 0.3 = distant backdrop
  <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${cam.x * depth}px, ${cam.y * depth}px) scale(${1 + (cam.s - 1) * depth})` }}>{children}</AbsoluteFill>
);
```

For that, expose the camera pose from a hook (`useCameraPose(keys)`) by extracting the loop from `Camera`; then `Camera` just renders one `Layer depth={1}`. Backdrop texture (Halftone, grain) at depth 0.2 to 0.4 gives instant depth. Also scale the blur: `filter: blur(${(1 - depth) * 6}px)` on far layers for depth of field.

### 6.3 Blur-in (any element)

```tsx
export const BlurIn: React.FC<{ at: number; children: React.ReactNode; blur?: number; rise?: number }> = ({ at, children, blur = 18, rise = 28 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: SPRING.calm });
  return <div style={{ opacity: interpolate(p, [0, 0.4, 1], [0, 1, 1]), filter: p < 0.999 ? `blur(${(1 - p) * blur}px)` : undefined, transform: `translateY(${(1 - p) * rise}px) scale(${0.98 + 0.02 * p})` }}>{children}</div>;
};
```

Drop the `filter` entirely when `p >= 0.999` (done above): a resting `blur(0px)` still forces a filter layer.

### 6.4 Scene to scene transitions with overlap (no @remotion/transitions)

Pattern: each scene `<Sequence>` is lengthened by `OVERLAP` frames so the next scene starts while the previous finishes. The incoming scene fades/blurs/rises in over `OVERLAP`; the outgoing scene fades/pushes out over the same frames. The incoming scene sits later in the DOM so it paints on top.

```tsx
// remotion/v2/transition.tsx
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { EASE } from "./motion";

export type SceneDef = { dur: number; node: React.ReactNode };

/** Scene wrapper: eases in over `inF` frames, eases out over `outF` frames before its own end. */
export const SceneFx: React.FC<{ dur: number; inF: number; outF: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ dur, inF, outF, first, last, children }) => {
  const f = useCurrentFrame();
  const tin = first ? 1 : EASE.out(Math.min(1, f / inF));
  const tout = last ? 0 : EASE.inOut(Math.min(1, Math.max(0, (f - (dur - outF)) / outF)));
  return (
    <AbsoluteFill style={{
      opacity: Math.min(tin, 1 - tout * 0.0) * (1 - tout),
      filter: (1 - tin) > 0.01 || tout > 0.01 ? `blur(${(1 - tin) * 14 + tout * 10}px)` : undefined,
      transform: `translateY(${(1 - tin) * 36}px) scale(${1 + tout * 0.035 - (1 - tin) * 0.02})`,
    }}>
      {children}
    </AbsoluteFill>
  );
};

/** Lays scenes out so each overlaps the next by `overlap` frames. Total = sum(dur) - overlap*(n-1). */
export const Scenes: React.FC<{ scenes: SceneDef[]; overlap?: number }> = ({ scenes, overlap = 14 }) => {
  let t = 0;
  return (
    <>
      {scenes.map((s, i) => {
        const from = t;
        t += s.dur - (i < scenes.length - 1 ? overlap : 0);
        return (
          <Sequence key={i} from={from} durationInFrames={s.dur}>
            <SceneFx dur={s.dur} inF={overlap} outF={overlap} first={i === 0} last={i === scenes.length - 1}>{s.node}</SceneFx>
          </Sequence>
        );
      })}
    </>
  );
};
// composition durationInFrames = scenes.reduce((a, s) => a + s.dur, 0) - overlap * (scenes.length - 1)
```

Notes: opacity-only crossfades between two opaque full-screen scenes dip in brightness mid way; the blur+rise combo above hides that. For a branded wipe reuse `BubbleReveal` from fx.tsx at the cut. Add a 2 to 4 frame audio overlap to match (audio is not affected by the visual overlap, so place SFX/VO by absolute frame).

If `@remotion/transitions` is ever added, the equivalent is:

```tsx
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
<TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })} />
```

Same rule: composition length = sum of sequences minus sum of transition durations.

### 6.5 Fake motion blur on fast moves

```ts
// velocity based blur: blur proportional to how far the spring moved this frame
const speed = Math.abs(p(frame) - p(frame - 1));      // 0..~0.1
const mb = Math.min(10, speed * 140);                  // px
// apply to a horizontal move only:  filter: `blur(${mb}px)` (isotropic is fine at under 6px)
```

## 7. Kinetic typography basics

Building blocks that cover most needs: (1) word stagger (section 4), (2) masked line rise, (3) weight/tracking animation on Space Grotesk variable font, (4) scale-up emphasis word, (5) number count with tabular figures, (6) highlighter swipe.

```tsx
// variable weight + tracking tightening as a headline lands (Space Grotesk is a variable font, 300..700)
const p = spring({ frame: frame - start, fps, config: SPRING.calm });
<h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: Math.round(interpolate(p, [0, 1], [300, 700])), letterSpacing: `${interpolate(p, [0, 1], [0.06, -0.015])}em` }} />

// emphasis word: slight scale + saffron highlighter that wipes in behind it
export const Highlight: React.FC<{ children: React.ReactNode; at: number; color?: string }> = ({ children, at, color = "#E8A93B" }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: SPRING.soft });
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 0.12em" }}>
      <span style={{ position: "absolute", left: 0, right: 0, bottom: "0.04em", height: "0.42em", background: color, opacity: 0.85, transformOrigin: "0 50%", transform: `scaleX(${p})`, zIndex: 0, borderRadius: 3 }} />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
};

// count up (deterministic, no rAF), tabular figures so the width does not jitter
export const Count: React.FC<{ to: number; at: number; dur?: number; size: number; color: string }> = ({ to, at, dur = 36, size, color }) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [at, at + dur], [0, to], { easing: EASE.out, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontVariantNumeric: "tabular-nums", fontSize: size, color }}>{v}</span>;
};
```

Per character reveal: split to chars with `Array.from(text)` (not `.split("")`, which breaks emoji), keep `white-space: pre` for spaces, stagger 1 to 2 frames.

House rules from CLAUDE.md that affect copy: no hyphens/dashes in on screen text, sentence case, plain verbs. The Stamp only at the four trust moments.

## 8. Gotchas

Determinism
- Only derive visuals from `useCurrentFrame()`. No `Math.random()` (use `random("seed")`), no `Date.now()`, no `setInterval`, CSS `animation`/`transition`, rAF, or `performance.now()`. Remotion renders frames in parallel tabs; wall clock effects will not match the frame.
- `useMemo` for precomputed tables is fine (pure). `useState`/`useEffect` for data must be wrapped in `delayRender`/`continueRender` (see `useBrandFonts` in fx.tsx).
- `<Sequence>` resets `useCurrentFrame()` to 0 at its `from`; helpers above assume scene relative frames.
- Use `<OffthreadVideo>` (already used) not `<Video>` for render accuracy; `<Img>` not `<img>` so Remotion waits for load.

Fonts
- fx.tsx already loads the three fonts from `staticFile("fonts/...")` with `@remotion/fonts` `loadFont` and gates on `delayRender`. Call `useBrandFonts()` once at the top of the composition. Variable fonts: pass `weight: "300 700"` as it does. Check `remotion/public-v2/fonts` is what `staticFile` resolves to (the comment says files are copied into the git ignored public dir). Always still-check a frame with text, a missing font silently falls back to sans-serif.
- Measure text with `@remotion/layout-utils` only if installed (it is not); use fixed `maxWidth` and `white-space` instead.

Assets
- `staticFile("img/shot.png")` resolves against the public dir (default `public/`; the repo uses `remotion/public-v2` via config, check `remotion.config.ts`). Never use relative `./` URLs or `file://`.
- `<Img src={staticFile(...)} />`; for a large PNG you scale up, ship 2x pixels.

Performance
- `filter: blur()` cost scales with radius times area. Blur only small elements or short windows, and remove the filter at rest (conditional style as above). Do not blur the full 1920x1080 stage every frame for a whole scene; instead blur a downscaled backdrop layer.
- `box-shadow` with huge blur radii on big elements is expensive each frame; keep each radius at or under about 120px, and prefer 3 small layered shadows to one giant one. A static shadow on a moving element still re-rasterises, put the shadow on a non-transformed parent and transform the child where possible, or pre-render the shadow as a PNG.
- `mixBlendMode`, SVG `feTurbulence` (the Grain component) and `backdrop-filter` are the heaviest items here; reduce `--concurrency` if memory climbs. Grain at one seed per 2 frames is a good tradeoff.
- `willChange: transform` helps a little; do not set it on dozens of elements.
- Avoid `preserve-3d` stacks deeper than one level.
- Increase render quality knobs only as needed: `--jpeg-quality=95`, `--scale=1`; for final use `--codec=h264 --crf=16`.

Rendering and stills (run from repo root; composition ids in Root.tsx: ExplainerV2, ExplainerV2Cutdown)

```bash
# one still at frame 120 (scene relative debugging: compute absolute frame first)
npx remotion still remotion/index.ts ExplainerV2 out/f120.png --frame=120

# several stills quickly (bash)
for f in 30 90 150 240; do npx remotion still remotion/index.ts ExplainerV2 out/f$f.png --frame=$f; done

# preview in Studio
npx remotion studio remotion/index.ts

# draft render, low res and fast, to check pacing
npx remotion render remotion/index.ts ExplainerV2 out/draft.mp4 --scale=0.5 --crf=28

# final
npx remotion render remotion/index.ts ExplainerV2 out/final.mp4 --codec=h264 --crf=16 --concurrency=4

# a frame range only
npx remotion render remotion/index.ts ExplainerV2 out/part.mp4 --frames=300-420
```

If the repo has an entry point set in `remotion.config.ts` or an npm script, the `remotion/index.ts` argument can be dropped; check `package.json` scripts. Stills are the right unit test for motion code: pick the first frame, the mid ease frame, and the settled frame of each move and confirm no clipping, blur left on, or text fallback font.

Premium feel checklist
- Everything that enters decelerates (out curves); things that travel inside the frame use in/out; nothing is linear except constant rotation and the film grain.
- Stagger instead of simultaneous; 3 to 5 frames between siblings; 14 to 18 frame scene overlaps.
- Camera never fully stops: add `useDrift` (2 to 6px) on held shots, and start the next move before the previous one visually ends (overlap keys by about 8 frames).
- One idea per shot, hold the final state for at least 0.6s so it can be read, keep key content inside the 5 percent safe area (SAFE_X/SAFE_Y in brand.ts).
- Cap springs at one gentle overshoot (`SPRING.pop`) and use it only for the Stamp and button release.
