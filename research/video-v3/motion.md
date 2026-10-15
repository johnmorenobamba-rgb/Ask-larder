# Motion patterns for promo v4 (Version B, "Three questions")

Paste-ready TypeScript/React patterns for the 60 to 75 s film, built only on `remotion/promo4/lib/anim.ts`, `camera.ts`, `color.ts`, `sync.ts`, `grid.ts` and `data.ts`. Nothing here needs a new package. Written 15 Oct 2026 by the motion agent.

## 0. Read first: conflicts, what is installed, house conventions

**Tempo conflict (lead to resolve).** `remotion/promo4/grid.ts` still says `BPM = 90` (beat 20 f, bar 80 f). The brief and `sound.md` §1.1 say **112.5 BPM, beat 16 f, bar 64 f**. Every pattern below reads `BEAT`, `BAR` and `b()` from `grid.ts`, so it follows whichever value lands, but the frame numbers quoted in prose assume 16 f beats. Set `export const BPM = 112.5;` in `grid.ts` (16 and 64 are whole, as the grid requires) before any act is timed.

**Installed** (`node_modules`): `remotion` 4.0.520 core, `@remotion/{bundler,canvas,captions,cli,fonts,media,media-parser,media-utils,player,renderer,streaming,studio,tailwind-v4,timeline-utils,web-renderer,zod-types}`, plus `qrcode`, `sharp`, `pngjs`.
**Not installed:** `@remotion/motion-blur` (no `<Trail>`, no `<CameraMotionBlur>`), `@remotion/transitions`, `@remotion/noise`, `@remotion/paths`, `@remotion/shapes`, `@remotion/layout-utils` (no `measureText`). So: blur, noise, path maths and text measuring are hand rolled below, and layouts are designed so nothing needs measuring (fixed width chits, left anchored word rolls, reserved answer boxes).

**Conventions every snippet follows**
* Every component takes an act local `frame` prop (number, may be fractional) instead of calling `useCurrentFrame()`. That is what makes the sub frame blur in §9 a one liner, and keeps state pure.
* Discrete state (typed characters, carets, counters, which pin is picked) is decided on `fd(frame)`.
* All translation lives in `transform`. No animated `left`/`top`.
* Vertical text moves end through `arrive()`; exits start through `depart()`.
* Overlays that track the product (cursor, ripples, viewfinder, the travelling bubble) are drawn in screen space with `toScreen(shot, worldPoint)`.
* Verified: every `remotion/promo4/fx/*` and `brand.ts` block below was extracted and type checked with `tsc --strict` against the real libs and Remotion 4.0.520's types (clean). The `acts/` excerpts (Hook) and inline usage lines are sketches and were not compiled. Nothing has been rendered yet: the contact sheet pass still applies.
* File homes proposed: `remotion/promo4/brand.ts` (tokens), `remotion/promo4/fx/*.tsx` (components), `remotion/promo4/acts/*.tsx` (acts). The `fx` folder exists and is empty.

### 0.1 Brand tokens (`remotion/promo4/brand.ts`)

```ts
// Larder Branding Kit. Display Space Grotesk, body Inter, utility IBM Plex Mono.
export const C = {
  ink: '#1F1B16',
  parchment: '#F2E9D8',
  red: '#B23A2C', // Preserve Red: deliberate accents only
  saffron: '#E8A93B', // the travelling device (the chit bubble)
  bay: '#55603C',
  clay: '#7A5C43',
  paper: '#FBF6EC', // card face on parchment (a lift, not a new hue)
  inkSoft: 'rgba(31,27,22,0.62)',
} as const;
export const FONT = {
  display: '"Space Grotesk", sans-serif',
  text: '"Inter", sans-serif',
  mono: '"IBM Plex Mono", monospace',
} as const;
// The mark (remotion/v2/brand.ts). viewBox 0 0 66 65. Note the left edge LEANS: it runs from
// (0,44) up to (10,14). That lean is what makes it an order chit, not a generic bubble; keep it.
export const BUBBLE_PATH = 'M10 14a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H31l-14 13V52h-9a8 8 0 0 1-8-8z';
```

### 0.2 Springs: calm versus landing (measured at 30 fps with Remotion's own `spring()`)

| Preset | zeta | 50 % | 97 % | first contact | overshoot | settled 0.5 % | Use |
|---|---|---|---|---|---|---|---|
| `SPR.firm` | 1.01 | 5 f | 14 f | 26 f | 0 | 19 f | UI arrivals, panels, cards: the default |
| `SPR.soft` | 1.19 | 5 f | 15 f | 28 f | 0 | 21 f | weighty moves, the phone, page growth |
| `SPR.heavy` | 1.34 | 7 f | 21 f | 38 f | 0 | 28 f | the pin field pull back, big world moves |
| `SPR.micro` | 0.87 | 2 f | 5 f | 6 f | 0.4 % | 6 f | badges, chips, the unread pill |
| `SPR.word` | 0.81 | 4 f | 9 f | 10 f | 1.3 % | 16 f | word locks; pass `overshootClamping: true` |
| `SPR.detent` | 0.79 | 2 f | 5 f | 5 f | 1.6 % | 9 f | viewfinder lock, reel detents; clamp |
| `SPR.snap` | 0.67 | 3 f | 5 f | 5 f | 5.8 % | 11 f | avoid at 30 fps unless clamped |
| `SPR.pop` | 0.53 | 3 f | 5 f | 5 f | 13.7 % | 16 f | not used: too fast to read at 30 fps |
| `SPR.land` | 0.51 | 3 f | 5 f | 6 f | 15.2 % | 20 f | landing #2 only (the close), if at all |

At 30 fps `pop`, `snap` and `land` cover most of their travel in 3 to 5 frames: a 300 px drop moves 60 to 90 px/f and strobes. Add these local presets (in `fx/springs.ts`, so `anim.ts` stays the lead's):

```ts
// remotion/promo4/fx/springs.ts. Measured at 30 fps: 97 % / contact / overshoot / settled.
import type { Spr } from '../lib/anim';
export const SPX = {
  bubble: { damping: 22, stiffness: 120, mass: 0.9 }, // 14 f / 26 f / 0 / 20 f: hook chits, message bubbles. Calm.
  chip: { damping: 28, stiffness: 220, mass: 0.8 }, // 10 f / 19 f / 0 / 14 f: pins, small UI. Calm.
  pin: { damping: 26, stiffness: 300, mass: 0.7 }, // 7 f / 9 f / 0.2 % / 8 f: pin drop settle after contact
  glide: { damping: 20, stiffness: 80, mass: 1 }, // 18 f / 34 f / 0 / 25 f: camera follow, slow lifts
  landCalm: { damping: 13, stiffness: 110, mass: 1 }, // 8 f / 9 f / 8.3 % / 26 f: THE landing at 30 fps
} satisfies Record<string, Spr>;
```

**Overshoot budget: two landings in the film, nothing else overshoots.**
1. 0:13.3, the fryer question bubble drops into the Ask Larder panel (match cut, §3.2). `SPX.landCalm` plus `squash()` anchored at the bubble's bottom edge.
2. The close, the device bubble resolves into the mark beside the wordmark. `SPX.landCalm` again (or `SPR.land` if it reads too soft on review).
Everything else uses `firm`, `soft`, `heavy`, `bubble`, `chip`, or a clamped `word`/`detent`. A spring that could cross other geometry or go negative gets `overshootClamping: true`.

---

## 1. The hook: three chit bubbles stacking, one per beat

Fixed width chits (order tickets are uniform), so nothing needs measuring. Each new chit rises from below at the stack's foot, scaling from its tail tip; the earlier chits are pushed up by the sum of later springs (a FLIP computed in closed form) and recede a step in colour and scale. The stack breathes in on the camera. The brief says one per beat; the script's times (0:00.3, 0:01.8, 0:03.2) are about three beats apart at 112.5 BPM. `STEP` makes it one constant.

```tsx
// remotion/promo4/fx/Chit.tsx
import React from 'react';
import { C, FONT } from '../brand';

/** The mark's shape at any size: body w x h px, tail below-left, the left edge leaning like the mark. */
export const chitPath = (w: number, h: number, s = h / 46) => {
  const r = 8 * s, lean = 10 * s, t0 = 17 * s, t1 = 31 * s, drop = 13 * s;
  return `M${lean} ${r}a${r} ${r} 0 0 1 ${r} ${-r}H${w - r}a${r} ${r} 0 0 1 ${r} ${r}V${h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${t1}l${t0 - t1} ${drop}V${h}H${r}a${r} ${r} 0 0 1 ${-r} ${-r}z`;
};

export const Chit: React.FC<{
  w: number; h: number; text: string; fill?: string; ink?: string; size?: number; family?: string; style?: React.CSSProperties;
}> = ({ w, h, text, fill = C.saffron, ink = C.ink, size = 60, family = FONT.display, style }) => {
  const s = h / 46;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h + 13 * s, ...style }}>
      <svg width={w} height={h + 13 * s} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d={chitPath(w, h, s)} fill={fill} />
      </svg>
      <div style={{ position: 'absolute', left: 10 * s + 28, right: 28, top: 0, height: h, display: 'flex', alignItems: 'center',
        fontFamily: family, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </div>
  );
};
```

```tsx
// remotion/promo4/acts/Hook.tsx (core of it)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BEAT, W, H } from '../grid';
import { E, prog, spr, hitPulse, arrive, mix, lmix } from '../lib/anim';
import { camera, type Shot } from '../lib/camera';
import { mixColor } from '../lib/color';
import { SPX } from '../fx/springs';
import { Chit } from '../fx/Chit';
import { C } from '../brand';
import { Q } from '../data';

const QS = [Q.fryer, Q.fridges, Q.oven];
const STEP = BEAT; // one per beat (brief). BEAT * 3 matches script B's printed times.
const AT = QS.map((_, i) => 9 + i * STEP); // first lands on 0:00.3; put the cues on the 16th grid in timeline.ts
const CW = 1360, CH = 150, GAP = 34; // world px; 1360 of 1920 = 71 % of frame width at k = 1, 85 %+ at the end of the push
const PITCH = CH + 13 * (CH / 46) + GAP; // body + tail + gap

export const HookStack: React.FC<{ frame: number }> = ({ frame: f }) => {
  // arrival springs (calm: no overshoot) and the stack lift they cause
  const a = AT.map((t) => spr(f, t, SPX.bubble));
  // slow two stage push: a held breath through the arrivals, then a dolly as the caption lands
  const k = lmix(0.92, 1.0, prog(f, 0, AT[2] + 30, E.dolly)) * lmix(1, 1.06, prog(f, AT[2] + 30, AT[2] + 150, E.dolly));
  // each arrival nudges the whole stack 1.2 % (acknowledgement, not overshoot)
  const nudge = 1 + 0.012 * AT.reduce((acc, t) => acc + hitPulse(f - t - 4, 2, 6), 0);
  // the camera keeps the stack's centre framed as it grows (half the total lift), so the stack never drifts off centre
  const grown = a.slice(1).reduce((acc, x) => acc + x, 0) * PITCH;
  const shot: Shot = { ax: CW / 2, ay: PITCH + CH / 2 - grown / 2, sx: W / 2, sy: H / 2 - 20, k: k * nudge };
  return (
    <AbsoluteFill style={{ background: C.parchment, overflow: 'hidden' }}>
      <div style={camera(shot)}>
        {QS.map((q, i) => {
          const p = a[i];
          if (p <= 0) return null;
          // slots: the newest sits at y = 0; every later arrival lifts this one by one PITCH
          const lift = a.slice(i + 1).reduce((acc, x) => acc + x, 0) * PITCH;
          const y = (1 - arrive(p, 0.96)) * 90 - lift + PITCH; // rises 90 px into its slot
          const age = a.slice(i + 1).reduce((acc, x) => acc + x, 0); // 0 newest, 1, 2 older
          const sc = mix(0.9, 1, p) * (1 - 0.035 * age); // grows from the tail tip, older chits recede
          const fill = mixColor(C.saffron, mixColor(C.saffron, C.parchment, 0.55), Math.min(1, age * 0.6));
          const ink = mixColor(C.ink, C.clay, Math.min(1, age * 0.5));
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${17 * CH / 46}px ${CH + 13 * CH / 46}px`,
              transform: `translate3d(0, ${y.toFixed(3)}px, 0) scale(${sc.toFixed(4)})`, opacity: prog(f, AT[i] - 1, AT[i] + 7, E.smooth) }}>
              <Chit w={CW} h={CH} text={q} fill={fill} ink={ink} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

Notes
* The stack is the "one huge centred subject": no text left, card right. The caption ("Every shift, the same questions.") mask rises under the stack on the downbeat after the third chit (§5.1), and the stack lifts by half a PITCH on `SPR.firm` to make room. Moving elements never cover text being read.
* The device: the oldest chit (the fryer question) is the one that later travels into Ask Larder, so keep its world rect exported (`HOOK_FRYER_RECT`) for the match cut (§3.2).
* Sound: a soft paper tick on each `hit(AT[i], SPX.bubble, 0.5)`; no whoosh (no scale move).

---

## 2. The phone: "Sorry to bother you on your day off"

Three stages, all in one world: (a) lock screen, notification lands and the clock yields; (b) more messages arrive, the notification stack grows and the unread count rolls; (c) the notification opens into the thread (container morph), bubbles stack with typing dots between them. The camera starts pushed in on the notification (k about 2.2) and pulls back to the whole phone as the stack grows: the pull back IS the "on your day off" reveal.

### 2.1 Phone frame and lock screen

```tsx
// remotion/promo4/fx/Phone.tsx
import React from 'react';
import { C, FONT } from '../brand';

export const PW = 620, PH = 1280; // world px; 19.5:9 ish
export const SCREEN = { x: 22, y: 22, w: PW - 44, h: PH - 44, r: 82 };

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH, borderRadius: 104, background: C.ink,
    boxShadow: `inset 0 0 0 2px ${C.clay}, 0 40px 80px -30px rgba(31,27,22,0.45)` }}>
    <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, borderRadius: SCREEN.r,
      overflow: 'hidden', background: '#2A241D' /* ink lifted 6 %: a screen, not a hole */ }}>
      {children}
      {/* island */}
      <div style={{ position: 'absolute', left: SCREEN.w / 2 - 70, top: 18, width: 140, height: 40, borderRadius: 20, background: C.ink }} />
    </div>
  </div>
);

export const LockClock: React.FC<{ time: string; day: string; yieldT: number }> = ({ time, day, yieldT }) => (
  // yieldT 0..1: the clock steps back when the first notification lands (dims, rises 18 px, shrinks 4 %)
  <div style={{ position: 'absolute', left: 0, top: 150, width: SCREEN.w, textAlign: 'center', color: C.parchment,
    transform: `translate3d(0, ${(-18 * yieldT).toFixed(3)}px, 0) scale(${1 - 0.04 * yieldT})`, opacity: 1 - 0.4 * yieldT }}>
    <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: '0.04em', opacity: 0.8 }}>{day}</div>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 168, lineHeight: 1, letterSpacing: '-0.03em' }}>{time}</div>
  </div>
);
```

### 2.2 Notification landing, the stack, the rolling unread count

Messages arrive at `MSG_AT[i]`. The first one is a full card dropping from under the island; later ones tuck behind it as a deck (each a 10 px peek, scale 0.95 per depth), and the card's "N new messages" line rolls.

```tsx
// remotion/promo4/fx/Notify.tsx
import React from 'react';
import { C, FONT } from '../brand';
import { E, prog, spr, arrive, mix, fd, hitPulse, SPR } from '../lib/anim';
import { SPX } from './springs';
import { Odometer } from './Odometer';
import { SCREEN } from './Phone';
import { PHONE } from '../data';

export const NotifyStack: React.FC<{ frame: number; at: number[] }> = ({ frame: f, at }) => {
  const n = at.filter((t) => fd(f) >= t).length; // whole frame: blur sub samples agree
  const first = spr(f, at[0], SPR.firm); // calm drop, no overshoot
  const y0 = mix(-150, 0, arrive(first, 0.97));
  const bump = at.slice(1).reduce((acc, t) => acc + hitPulse(f - t, 2, 5), 0); // the card flinches 1.5 % per new message
  const W = SCREEN.w - 48;
  return (
    <div style={{ position: 'absolute', left: 24, top: 400, width: W }}>
      {/* deck behind: one sliver per extra message, max 2 drawn */}
      {[2, 1].map((d) => {
        const p = n > d ? spr(f, at[d], SPX.chip) : 0;
        return p <= 0 ? null : (
          <div key={d} style={{ position: 'absolute', left: 0, top: 0, width: W, height: 150, borderRadius: 34,
            background: d === 1 ? '#3A3229' : '#332C24', transformOrigin: '50% 0',
            transform: `translate3d(0, ${(y0 + mix(0, 14 * d, p)).toFixed(3)}px, 0) scale(${1 - 0.05 * d})` }} />
        );
      })}
      <div style={{ position: 'relative', borderRadius: 34, padding: '24px 28px', background: 'rgba(242,233,216,0.94)', color: C.ink,
        transform: `translate3d(0, ${y0.toFixed(3)}px, 0) scale(${(mix(0.96, 1, first) * (1 + 0.015 * bump)).toFixed(4)})`,
        opacity: prog(f, at[0] - 1, at[0] + 6, E.smooth) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 22, color: C.clay }}>
          <span>MESSAGES</span><span>now</span>
        </div>
        <div style={{ fontFamily: FONT.text, fontWeight: 600, fontSize: 30, marginTop: 6 }}>{PHONE.from}</div>
        <div style={{ fontFamily: FONT.text, fontSize: 28, lineHeight: 1.3 }}>{PHONE.lines[0]}</div>
        {n > 1 && (
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.clay, marginTop: 8, display: 'flex', gap: 10,
            opacity: prog(f, at[1] - 1, at[1] + 8, E.smooth) }}>
            <Odometer frame={f} from={1} steps={at.slice(1).map((t, i) => ({ at: t, value: i + 2 }))} size={22} />
            <span>new messages</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

The same `Odometer` (§5.3) drives the red unread badge on the thread's back chevron in stage (c), so the count keeps rolling across the morph: one number, one motion, never a crossfade.

### 2.3 Notification opens into the thread (container morph), bubbles stack, typing dots

```tsx
// remotion/promo4/fx/Morph.ts: rect morph for "grows from" moves (notification to thread, pin to page)
import { mix, lmix } from '../lib/anim';
export type Rect = { x: number; y: number; w: number; h: number; r: number };
/** Position linear, size in log space (no apparent acceleration), radius linear. */
export const morphRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: lmix(a.w, b.w, t), h: lmix(a.h, b.h, t), r: mix(a.r, b.r, t),
});
/** Children of a morphing shell: content fades in only after the shell is 60 % there (shell first, then contents). */
export const contentIn = (t: number) => Math.max(0, (t - 0.6) / 0.4);
```

```tsx
// remotion/promo4/fx/Thread.tsx
import React from 'react';
import { C, FONT } from '../brand';
import { E, prog, spr, arrive, fd, mix, rand } from '../lib/anim';
import { SPX } from './springs';

export type Msg = { text: string; at: number; typingFrom?: number }; // typingFrom: dots show from here to `at`

/** Three dots, phases 120 degrees apart, a 24 f cycle; pure function of the frame. */
export const TypingDots: React.FC<{ frame: number; show: number }> = ({ frame: f, show }) => (
  <div style={{ display: 'inline-flex', gap: 10, padding: '22px 26px', borderRadius: 30, background: '#3A3229', opacity: show,
    transform: `scale(${mix(0.8, 1, show)})`, transformOrigin: '0 100%' }}>
    {[0, 1, 2].map((i) => {
      const ph = Math.sin(((f - i * 4) / 24) * Math.PI * 2) * 0.5 + 0.5; // 0..1
      return <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: C.parchment,
        opacity: 0.35 + 0.65 * ph, transform: `translate3d(0, ${(-5 * ph).toFixed(2)}px, 0)` }} />;
    })}
  </div>
);

/**
 * Incoming bubbles stack from the bottom. Row heights are fixed per message (set `h`), so the lift is
 * closed form: every bubble sits at -(sum of later bubbles' heights x their springs). No measuring.
 */
export const Thread: React.FC<{ frame: number; msgs: (Msg & { h: number })[]; width: number }> = ({ frame: f, msgs, width }) => {
  const a = msgs.map((m) => spr(f, m.at, SPX.bubble));
  const GAP = 16;
  return (
    <div style={{ position: 'absolute', left: 24, bottom: 150, width }}>
      {msgs.map((m, i) => {
        if (a[i] <= 0) return null;
        const lift = msgs.slice(i + 1).reduce((acc, n, j) => acc + (n.h + GAP) * a[i + 1 + j], 0);
        const y = -lift + (1 - arrive(a[i], 0.96)) * 40;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, bottom: 0, maxWidth: width * 0.82, padding: '20px 26px', borderRadius: 30,
            borderBottomLeftRadius: 8, background: '#3A3229', color: C.parchment, fontFamily: FONT.text, fontSize: 30, lineHeight: 1.3,
            transformOrigin: '0 100%', transform: `translate3d(0, ${y.toFixed(3)}px, 0) scale(${mix(0.92, 1, a[i]).toFixed(4)})`,
            opacity: prog(f, m.at - 1, m.at + 6, E.smooth) }}>
            {m.text}
          </div>
        );
      })}
      {/* typing dots for the next message: visible from typingFrom to at, then the bubble replaces them in place */}
      {msgs.map((m, i) => {
        if (m.typingFrom === undefined) return null;
        const on = prog(f, m.typingFrom, m.typingFrom + 6, E.smooth) * (1 - prog(f, m.at - 2, m.at + 2, E.smooth));
        return on <= 0 ? null : <div key={`t${i}`} style={{ position: 'absolute', left: 0, bottom: 0 }}><TypingDots frame={f} show={on} /></div>;
      })}
    </div>
  );
};
```

Choreography for Pain 1 (0:07 to 0:13 in script B), all on the 16th grid:
* 0:07.2 notification lands (`SPR.firm`), clock yields over 10 f (`E.smooth`). Camera on the card at k 2.0.
* Dots for 20 to 28 f, then message 2 (`PHONE.lines[1]`, the fryer question) tucks into the deck and the unread line rolls to 2. If the stack should grow further (3, 4), add the extra lines to `data.ts` first (its asserts check dashes and exclamation marks); never invent a string inside an act.
* Camera pulls back from k 2.0 to 0.82 (whole phone) on `E.cam` over 2 bars while the count rolls: the reveal of the phone on a table is the "day off".
* The tap opens the thread: `morphRect(notifRect, screenRect, spr(f, tap, SPR.soft))`, content via `contentIn`. The cursor does not appear on a phone: a thumb would be literal. The open is caused by the count reaching its last value (cause), then the open (effect).

---

## 3. Reveal by subtraction, and the match cut into Ask Larder

### 3.1 Subtraction: clutter flies off along vectors from the hero's centre

The Ask Larder panel with its answer is laid out and fully drawn from the first frame of the act, underneath. The clutter (the unanswered phone bubbles, the notification deck, the phone frame itself) sits on top. Each piece leaves along the ray from the hero's centre through its own centre, accelerating (`E.exit`), nearest first so the centre clears first, with a seeded 0 to 3 f spread. It stretches along its velocity at speed, which reads as motion blur at 30 fps for almost no cost.

```tsx
// remotion/promo4/fx/Subtract.tsx
import React from 'react';
import { E, prog, rand, clamp, mix } from '../lib/anim';

export type Piece = { id: string; x: number; y: number; w: number; h: number; node: React.ReactNode }; // world px, centre at x + w/2

export const Subtract: React.FC<{
  frame: number; at: number; pieces: Piece[]; hero: { x: number; y: number }; dur?: number; reach?: number;
}> = ({ frame: f, at, pieces, hero, dur = 16, reach = 2600 }) => {
  const order = pieces.map((p) => Math.hypot(p.x + p.w / 2 - hero.x, p.y + p.h / 2 - hero.y));
  const maxD = Math.max(...order, 1);
  return (
    <>
      {pieces.map((p, i) => {
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        let dx = cx - hero.x, dy = cy - hero.y;
        const len = Math.hypot(dx, dy) || 1;
        if (len < 1) { dx = 0; dy = -1; } // a piece on the centre leaves upward
        dx /= len; dy /= len;
        const start = at + Math.round((order[i] / maxD) * 6) + Math.floor(rand(`sub${p.id}`) * 4); // nearest first, 0 to 3 f jitter
        const q = prog(f, start, start + dur, E.exit);
        const qPrev = prog(f - 1, start, start + dur, E.exit);
        const v = (q - qPrev) * reach; // px per frame along the ray
        const stretch = 1 + clamp(v / 60, 0, 1) * 0.35; // up to +35 % along travel at 60 px/f
        const ang = Math.atan2(dy, dx);
        const spin = (rand(`spin${p.id}`) - 0.5) * 14 * q; // a few degrees of tumble, seeded
        if (q >= 1) return null;
        return (
          <div key={p.id} style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transformOrigin: '50% 50%',
            transform: `translate3d(${(p.x + dx * reach * q).toFixed(2)}px, ${(p.y + dy * reach * q).toFixed(2)}px, 0) rotate(${ang}rad) scale(${stretch.toFixed(4)}, ${(1 / Math.sqrt(stretch)).toFixed(4)}) rotate(${-ang}rad) rotate(${spin.toFixed(2)}deg)`,
            opacity: 1 - prog(f, start + dur * 0.6, start + dur, E.smooth) }}>
            {p.node}
          </div>
        );
      })}
    </>
  );
};
```

* The hero behind does a counter move as it is uncovered: k 1.04 down to 1.0 on `E.outSoft` over 30 f, so it feels already there and settling, not appearing.
* Every piece is gone within `6 + 3 + dur` = 25 f. Sound: one air swell on the subtraction's peak speed (`peak(at, at + dur, E.exit)`), not one per piece.
* The pieces live in world space under the same camera, so a slow camera move continues through the subtraction (no stall).

### 3.2 Match cut: the hook bubble drops into the Ask Larder panel (landing #1)

The fryer chit is the one piece the subtraction spares. It is a screen space overlay that starts on its exact on screen rect in shot A and lands on the question slot of the Ask Larder panel, projected through shot B's camera every frame. On contact it hands off to the panel's own element on the next frame with an identical transform (no seam shimmer).

```tsx
// remotion/promo4/fx/DropInto.tsx
import React from 'react';
import { E, prog, mix, lmix, spr, squash, fd } from '../lib/anim';
import { toScreen, type Shot } from '../lib/camera';
import { mixColor } from '../lib/color';
import { SPX } from './springs';
import { C } from '../brand';

/**
 * from: the chit's screen rect at `lift` (from shot A). slot: the question slot in WORLD px of the
 * panel, projected through shotB(frame) so the landing tracks a moving camera. The fall is two
 * phases: lift and travel on E.glide, then the last 22 % drops on E.contact (arrives with speed),
 * then landCalm settles it (8 % overshoot, one of the film's two landings) with a squash at the
 * bottom edge.
 */
export const DropInto: React.FC<{
  frame: number; lift: number; contact: number; from: { x: number; y: number; w: number };
  slot: { x: number; y: number; w: number }; shotB: (f: number) => Shot; children: (fill: string, ink: string) => React.ReactNode;
}> = ({ frame: f, lift, contact, from, slot, shotB, children }) => {
  const sB = shotB(f);
  const tl = toScreen(sB, { x: slot.x, y: slot.y });
  const to = { x: tl.x, y: tl.y, w: slot.w * sB.k };
  const hover = { x: to.x, y: to.y - 120 * sB.k, w: to.w }; // 120 world px above the slot
  const t1 = prog(f, lift, contact - 7, E.glide); // travel to the hover point
  const t2 = prog(f, contact - 7, contact, E.contact); // drop into the slot, with speed
  const settle = f >= contact ? spr(f, contact, SPX.landCalm) : 0; // 0 -> ~1.083 -> 1
  const base = { x: mix(from.x, hover.x, t1), y: mix(from.y, hover.y, t1), w: lmix(from.w, hover.w, t1) };
  const yDrop = mix(base.y, to.y, t2) + (f >= contact ? (1 - settle) * -14 * sB.k : 0); // the overshoot reads as a 1 px class rebound
  const sq = squash(f - contact); // along 0.9, across 1.08 at contact, back over ~4 f at 30 fps
  const k = base.w / from.w;
  const fill = mixColor(C.saffron, C.paper, prog(f, contact - 2, contact + 10, E.smooth)); // device colour hands over to the panel's question style
  const ink = C.ink;
  if (fd(f) > contact + 24) return null; // the panel's own element has taken over (identical transform)
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 100%',
      transform: `translate3d(${base.x.toFixed(2)}px, ${yDrop.toFixed(2)}px, 0) scale(${(k * sq.across).toFixed(4)}, ${(k * sq.along).toFixed(4)})` }}>
      {children(fill, ink)}
    </div>
  );
};
```

* The panel acknowledges the hit: its shadow tightens and it dips 3 px on `hitPulse(f - contact, 2, 6)`; the answer area below begins streaming 10 f later (§4.2): cause, action, result.
* Put `contact` on a downbeat (`b(bar)`), start the drop `contact - 7`, and let `sync.ts` place the landing sound at `hit(contact, SPX.landCalm, 1)`.
* Handoff rule (Chromium trap 10): the overlay and the in panel question must use the same placement method. Render the in panel question from `contact + 1` with the same `translate3d` maths fed by `toScreen`, or keep the overlay alive through the read hold and hide the panel's copy. Do not mix layout and transform across the seam.

---

## 4. Typing into the input, and a streamed answer with a stable layout

### 4.1 Typing with caret (safe question, 0:21.8 to 0:23.2)

Schedule computed once (export it for the sound), time boxed, eased, per character weights. The caret is an inline zero width span after the typed text, so it follows the text with no measuring and never shifts layout.

```ts
// remotion/promo4/fx/typing.ts
import { rand, E } from '../lib/anim';
/** Frame each character appears, `start` to `end` (absolute or act local), most characters early (E.type). */
export const typeSchedule = (text: string, start: number, end: number, seed = 'k') => {
  const w = [...text].map((ch, i) => {
    let x = 0.75 + rand(`${seed}${i}`) * 0.6;
    if (ch === ' ') x *= 0.7;
    if (text[i - 1] === '?' || text[i - 1] === '.') x += 2.2;
    return x;
  });
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return w.map((x) => start + E.type((acc += x) / total) * (end - start));
};
```

```tsx
// remotion/promo4/fx/TypeField.tsx
import React from 'react';
import { C, FONT } from '../brand';
import { fd, clamp } from '../lib/anim';
import { mixColor } from '../lib/color';

export const TypeField: React.FC<{ frame: number; text: string; at: number[]; placeholder: string; size?: number; focus?: number }> = ({
  frame: f, text, at, placeholder, size = 34, focus = 1,
}) => {
  const F = fd(f);
  const n = at.filter((t) => t <= F).length;
  const idle = n === text.length && F > at[at.length - 1] + 6;
  const caretOn = !idle || Math.floor((F - at[at.length - 1]) / 16) % 2 === 0; // blink on the beat (16 f) once idle
  return (
    <div style={{ position: 'relative', height: size * 2.1, borderRadius: 18, padding: `0 ${size * 0.7}px`, display: 'flex', alignItems: 'center',
      background: C.paper, boxShadow: `inset 0 0 0 2px ${mixColor('#D9CDB8', C.ink, focus)}`, // focus ring: border tone to ink
      fontFamily: FONT.text, fontSize: size, color: C.ink, whiteSpace: 'pre' }}>
      {n === 0 && <span style={{ color: C.inkSoft }}>{placeholder}</span>}
      {[...text.slice(0, n)].map((ch, i) => {
        const age = clamp((F - at[i]) / 12); // each new character lands in Preserve Red, relaxes to ink over 12 f
        return <span key={i} style={{ color: mixColor(C.red, C.ink, 1 - (1 - age) ** 2) }}>{ch}</span>;
      })}
      <span style={{ position: 'relative', display: 'inline-block', width: 0 }}>
        <span style={{ position: 'absolute', left: 2, top: -size * 0.62, width: 3, height: size * 1.2, background: C.ink, opacity: caretOn ? 1 : 0 }} />
      </span>
    </div>
  );
};
```

Typing time box at 30 fps: 29 characters ("Where is the key to the safe?") over 36 to 42 f (script: 1.4 s = 42 f), last key at about 80 % of the box, then the field holds while the answer arrives. Keep the field alive with `breath()` on the camera (+2.5 % across the hold). Before typing: cursor arrives, hover 3 f (6 f at 60), press, the field's ring goes ink (`focus` 0 to 1 over 6 f on `E.ui`).

### 4.2 Streamed answer that never reflows

Render the WHOLE answer from the first frame; unrevealed words are `visibility: hidden`, so line breaks and box height are final from frame one. Reveal in chunks of 1 to 3 words on a seeded schedule (a real stream arrives in tokens), each word fading 0 to 1 over 6 f and colour resolving from Clay to Ink over 12 f. The streaming caret is a zero width absolute span, like the input's.

```tsx
// remotion/promo4/fx/Stream.tsx
import React from 'react';
import { C, FONT } from '../brand';
import { fd, rand, clamp, prog, E } from '../lib/anim';
import { mixColor } from '../lib/color';

/** Frame each word appears: chunks of 1 to 3 words every 2 to 3 frames from `start`. */
export const streamSchedule = (text: string, start: number, seed = 's') => {
  const words = text.split(' ');
  const at: number[] = [];
  let t = start, i = 0, c = 0;
  while (i < words.length) {
    const chunk = 1 + Math.floor(rand(`${seed}c${c}`) * 3);
    for (let j = 0; j < chunk && i < words.length; j++) at[i++] = t;
    t += 2 + Math.floor(rand(`${seed}g${c++}`) * 2);
  }
  return { words, at, end: t };
};

export const Stream: React.FC<{ frame: number; text: string; start: number; size: number; family?: string; width: number }> = ({
  frame: f, text, start, size, family = FONT.text, width,
}) => {
  const { words, at, end } = streamSchedule(text, start);
  const F = fd(f);
  const last = at.filter((t) => t <= F).length - 1;
  return (
    <div style={{ width, fontFamily: family, fontSize: size, lineHeight: 1.45, color: C.ink }}>
      {words.map((w, i) => {
        const shown = F >= at[i];
        const age = clamp((f - at[i]) / 12);
        return (
          <React.Fragment key={i}>
            <span style={{ visibility: shown ? 'visible' : 'hidden', opacity: shown ? prog(f, at[i] - 1, at[i] + 5, E.smooth) : 0,
              color: mixColor(C.clay, C.ink, age) }}>{w}</span>
            {i === last && F < end + 8 && (
              <span style={{ position: 'relative', display: 'inline-block', width: 0 }}>
                <span style={{ position: 'absolute', left: 4, top: size * 0.12, width: size * 0.42, height: size * 1.05, background: C.saffron, borderRadius: 3 }} />
              </span>
            )}
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </div>
  );
};
```

* The fryer answer is 5 numbered steps. Split on `/ (?=\d\. )/` and render each step as its own row with a hanging number, still all laid out from frame one. Steps that land get a Saffron number for 12 f, then Clay.
* `ASK.shortAnswerChars`: answers over 60 characters render in Inter (both film answers), shorter ones in Space Grotesk, matching the app.
* The panel never grows per word. If the design wants the bubble to grow, grow it by whole rows: row count from the step split, height on `SPR.firm` per row. Never animate `height: auto`.
* Reading speed: the answer is the read. After `end`, hold at least 36 f + 6 f per word of what the viewer must take in; the camera may creep (`breath`) but text moves under 1.5 px/f while being read.
* The supervisor line (`ASK.safeAnswer`) streams the same way but in one chunk per clause, slower (4 f gaps), and the hold after it is the film's most still moment: no creep above 1 %, no cursor.

---

## 5. Kinetic type

### 5.1 Mask rise per word (self contained port of the starter's `MaskRise`)

```tsx
// remotion/promo4/fx/MaskRise.tsx
import React from 'react';
import { FONT, C } from '../brand';
import { arrive, arriveK, blurIn, depart, E, prog } from '../lib/anim';
import { mixColor } from '../lib/color';

export const MaskRise: React.FC<{
  text: string; frame: number; start: number; size: number; family?: string; weight?: number; lead?: number;
  stagger?: number; dur?: number; out?: number; outDur?: number; blur?: number; color?: string; align?: 'left' | 'center';
}> = ({ text, frame: f, start, size, family = FONT.display, weight = 700, lead = 1.08, stagger = 3, dur = 15, out, outDur = 8, blur = 0, color = C.ink, align = 'center' }) => {
  const pad = { t: 0.12, b: 0.26, x: 0.1 };
  const travel = lead + pad.t + pad.b; // em
  const ka = arriveK(travel * size, dur, E.out);
  let k = -1;
  return (
    <div style={{ fontFamily: family, fontWeight: weight, fontSize: size, lineHeight: lead, letterSpacing: '-0.02em', textAlign: align, display: 'flex', flexDirection: 'column' }}>
      {text.split('\n').map((line, li) => (
        <div key={li} style={{ overflow: 'hidden', padding: `${pad.t}em ${pad.x}em ${pad.b}em`, margin: `-${pad.t}em -${pad.x}em -${pad.b}em` }}>
          {line.split(' ').map((w, wi, arr) => {
            k++;
            const s = start + k * stagger;
            const p = prog(f, s, s + dur, E.out);
            const q = out === undefined ? 0 : prog(f, out + k * (stagger / 2), out + k * (stagger / 2) + outDur, E.in);
            const y = (1 - arrive(p, ka)) * travel - depart(q) * travel;
            const b = blur > 0 ? blurIn(p, blur) : 0;
            return (
              <span key={wi} style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${y.toFixed(4)}em)`,
                color: mixColor(mixColor(color, C.parchment, 0.55), color, Math.min(1, p / 0.7)), // ink resolve on arrival
                filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined, visibility: p <= 0 || q >= 1 ? 'hidden' : undefined }}>
                {wi < arr.length - 1 ? w + ' ' : w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
```

30 fps values: `dur` 15 f (30 at 60), `stagger` 3 f (5 at 60, rounded up so the cascade reads), `outDur` 8 f. Captions start on a 16th, at `cue - 1`.

### 5.2 Staggered word roll: "Every shift" to "Every day" to "Every week"

"Every" never moves. The changing word sits in a one line mask; on each change the outgoing letters leave upward and the incoming rise from below, both staggered one frame per letter, so the change ripples left to right. The line is LEFT anchored (the caption's left edge is fixed on the layout grid), so a width change only moves the line's right end and nothing needs measuring. The roll lands each word on the beat that the VO says it.

```tsx
// remotion/promo4/fx/WordRoll.tsx
import React from 'react';
import { FONT, C } from '../brand';
import { prog, E, arrive, depart, arriveK, fd } from '../lib/anim';

export const WordRoll: React.FC<{ frame: number; fixed: string; words: string[]; at: number[]; size: number; color?: string; accent?: string; per?: number; dur?: number }> = ({
  frame: f, fixed, words, at, size, color = C.ink, accent = C.red, per = 1, dur = 10,
}) => {
  const lead = 1.1;
  const ka = arriveK(lead * size, dur, E.out);
  const cur = Math.max(0, at.filter((t) => fd(f) >= t).length - 1);
  const letters = (w: string, phase: 'in' | 'out', t0: number) =>
    [...w].map((ch, i) => {
      const s = t0 + i * per;
      const y = phase === 'in' ? (1 - arrive(prog(f, s - 1, s - 1 + dur, E.out), ka)) * lead : -depart(prog(f, s - 1, s - 1 + dur * 0.8, E.in)) * lead;
      return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${y.toFixed(4)}em)` }}>{ch}</span>;
    });
  return (
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: size, lineHeight: lead, color, letterSpacing: '-0.02em', whiteSpace: 'nowrap', display: 'flex' }}>
      <span>{fixed}&nbsp;</span>
      <span style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', padding: '0.12em 0.1em 0.26em', margin: '-0.12em -0.1em -0.26em', color: accent }}>
        {/* the incoming word is in flow (sets the width); the outgoing one is absolute over it */}
        <span style={{ display: 'inline-block' }}>{letters(words[cur], 'in', at[cur])}</span>
        {cur > 0 && fd(f) < at[cur] + words[cur - 1].length * per + dur && (
          <span style={{ position: 'absolute', left: '0.1em', top: '0.12em' }}>{letters(words[cur - 1], 'out', at[cur])}</span>
        )}
      </span>
    </div>
  );
};
```

* Usage: `<WordRoll fixed="Every" words={['shift', 'day', 'week']} at={[b(B0), b(B0, 1), b(B0, 2)]} size={140} />`. The VO reads each full stop as a beat; 16 f apart fits.
* Vocabulary check: the app's forms hub headings are "Every shift", "Daily", "Weekly". The roll is the spoken line; when the hub fills in behind it, light the app's own headings in the same order on the same frames (`FORMS.cadences`), so the type and the UI agree without the film inventing headings.
* The accent colour goes on the changing word only (Preserve Red, used deliberately).

### 5.3 Rolling digit counter (odometer)

Lean port of the starter's `Roll` for small integers: each digit column is a strip in a one line mask; a step slides its column one slot (rising when the value grows), landing through `arrive`. Tabular figures, fixed column count, so the box never changes width. Used for the unread count (§2.2), the checklist ("8 of 8"), and "1 reading flagged".

```tsx
// remotion/promo4/fx/Odometer.tsx
import React from 'react';
import { FONT } from '../brand';
import { prog, E, arrive, arriveK, fd } from '../lib/anim';

export type Step = { at: number; value: number };

export const Odometer: React.FC<{ frame: number; from: number; steps: Step[]; size: number; digits?: number; roll?: number; family?: string; style?: React.CSSProperties }> = ({
  frame: f, from, steps, size, digits, roll = 7, family = FONT.mono, style,
}) => {
  const values = [from, ...steps.map((s) => s.value)];
  const D = digits ?? Math.max(...values.map((v) => String(v).length));
  const lead = 1.2;
  const ka = arriveK(lead * size, roll, E.out);
  const dig = (v: number, c: number) => { const p = 10 ** (D - 1 - c); return p === 1 || v >= p ? Math.floor(v / p) % 10 : -1; };
  return (
    <span style={{ fontFamily: family, fontSize: size, lineHeight: lead, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', ...style }}>
      {Array.from({ length: D }, (_, c) => {
        // strip position: +1 per change of this column's digit (values only grow in this film)
        let pos = 0; const slots: { d: number; s: number }[] = [{ d: dig(values[0], c), s: 0 }];
        steps.forEach((st, e) => {
          const d = dig(values[e + 1], c);
          if (d !== slots[slots.length - 1].d) { slots.push({ d, s: slots.length }); pos += arrive(prog(f, st.at - 1, st.at - 1 + roll, E.out), ka); }
        });
        return (
          <span key={c} style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', height: `${lead}em` }}>
            <span style={{ visibility: 'hidden' }}>0</span>
            {slots.map((sl) => {
              const y = sl.s - pos; // 0 = in view, 1 = below, -1 = above
              return Math.abs(y) >= 1 || sl.d < 0 ? null : (
                <span key={sl.s} style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${(y * lead).toFixed(4)}em)` }}>{sl.d}</span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
};
```

Counters roll per event (one step per tick of the checklist, on the frame the tick lands), never crossfaded. For "Mark the rest as pass" (7 rows tick at once), step the count across 7 consecutive 16ths with `stagger`, each row's tick and the digit landing on the same frame.

---

## 6. Cursor on bowed arcs, ripples and press states over a moving camera

The cursor, its ripple and its hover halo live in screen space, OUTSIDE the camera container, so they never balloon with the zoom. The target is re projected every frame through the live shot, so the arc lands on the button even while the camera pushes. The button's own press state lives in world space (it is part of the product).

```tsx
// remotion/promo4/fx/Cursor.tsx
import React from 'react';
import { C } from '../brand';
import { mix, prog, E, clamp } from '../lib/anim';
import { toScreen, type Shot } from '../lib/camera';

type Pt = { x: number; y: number };
export const arc = (a: Pt, b: Pt, t: number, bow = 0.2): Pt => {
  const cx = (a.x + b.x) / 2 - (b.y - a.y) * bow, cy = (a.y + b.y) / 2 + (b.x - a.x) * bow;
  return { x: mix(mix(a.x, cx, t), mix(cx, b.x, t), t), y: mix(mix(a.y, cy, t), mix(cy, b.y, t), t) };
};
/** 0..1: down over 2 f, recoil over 4 f (the 4 / 8 f of the 60 fps reference). */
export const press = (f: number, at: number) => { const t = f - at; return t <= 0 || t >= 6 ? 0 : t < 2 ? t / 2 : 1 - (t - 2) / 4; };

export const Pointer: React.FC<{ x: number; y: number; scale?: number; down?: number; opacity?: number }> = ({ x, y, scale = 1.6, down = 0, opacity = 1 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, opacity, transformOrigin: '0 0', transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale * (1 - 0.12 * down)})`,
    filter: 'drop-shadow(0 3px 5px rgba(31,27,22,0.28))' }}>
    <svg width={30} height={42} viewBox="0 0 30 42" style={{ position: 'absolute', left: -3, top: -2 }}>
      <path d="M3 2 L3 33 L10.2 26.4 L15 38 L20.2 35.8 L15.4 24.4 L25 24.4 Z" fill={C.ink} stroke={C.parchment} strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  </div>
);

/** Ripple pinned to a WORLD point: drawn in screen space, radius scales with the shot so it matches the button. */
export const Ripple: React.FC<{ frame: number; at: number; shot: Shot; p: Pt; r?: number; color?: string }> = ({ frame: f, at, shot, p, r = 46, color = C.red }) => {
  const t = prog(f, at, at + 14, E.out);
  if (f < at || t >= 1) return null;
  const s = toScreen(shot, p), R = r * shot.k * mix(0.35, 1, t);
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * R, height: 2 * R, borderRadius: '50%',
    transform: `translate3d(${(s.x - R).toFixed(2)}px, ${(s.y - R).toFixed(2)}px, 0)`,
    boxShadow: `inset 0 0 0 ${Math.max(1.5, 2.5 * (1 - t))}px ${color}`, opacity: 0.55 * (1 - prog(f, at + 4, at + 14, E.smooth)) }} />;
};

/** One gesture: enter, travel on a bow, hover, press, then leave once the product acts on its own. */
export const useGesture = (f: number, shot: Shot, g: { from: Pt; target: Pt /* world */; move: [number, number]; click: number; leaveAfter?: number }) => {
  const tgt = toScreen(shot, g.target); // re projected every frame
  const t = prog(f, g.move[0], g.move[1], E.out);
  const pos = arc(g.from, tgt, t, 0.18);
  const leave = g.leaveAfter ?? 12;
  return {
    pos, tgt,
    hover: clamp(prog(f, g.click - 4, g.click - 1, E.ui)), // hover state ~3 f before the press (6 f at 60)
    down: press(f, g.click),
    opacity: prog(f, g.move[0] - 4, g.move[0], E.smooth) * (1 - prog(f, g.click + leave, g.click + leave + 6, E.smooth)),
  };
};
```

```tsx
// in an act: world button reacts on the same frame as the press; cursor and ripple drawn after the camera div
const g = useGesture(f, shot, { from: { x: 1500, y: 980 }, target: SAVE_BTN_CENTRE, move: [T - 16, T - 4], click: T });
// world space, inside camera(shot):
<button style={{ transform: `scale(${1 - 0.03 * g.down})`, background: mixColor(mixColor(C.ink, C.clay, 0.25 * g.hover), C.red, 0.25 * g.down) }} />
// screen space, after the camera div:
<Ripple frame={f} at={T} shot={shot} p={SAVE_BTN_CENTRE} />
<Pointer x={g.pos.x} y={g.pos.y} down={g.down} opacity={g.opacity} />
```

30 fps values: travel 8 to 12 f on `E.out` (12 to 20 at 60), at least 30 f of dwell around the press, at most one click per 15 f (30 at 60), with irregular gaps (4, 6, 9 f between micro actions). The cursor leaves 12 f after the last click once the product acts on its own, and never returns in that act. The arc bows away from the text being read. Pan the click sound from `g.tgt.x`.

---

## 7. Pin field pull back, the pick, the page grows from the pin, and the QR scan

### 7.1 The field: stations as chit pins with QR markers

The venue's stations become a field of small Saffron chits (the device again), each with a real QR glyph. The camera starts tight on the pizza oven pin (k 3.2) where Pain 3 left the oven question bubble, then pulls back to the whole field on `SPR.heavy` driven progress while the other pins drop in as they enter frame.

```tsx
// remotion/promo4/fx/Qr.tsx: a real QR as ONE path (1 DOM node, not 1000 rects)
import React from 'react';
import QRCode from 'qrcode';
const cache = new Map<string, { d: string; n: number }>();
export const qrPath = (text: string) => {
  if (!cache.has(text)) {
    const q = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const n = q.modules.size; let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    cache.set(text, { d, n });
  }
  return cache.get(text)!;
};
export const Qr: React.FC<{ text: string; size: number; color: string; bg: string }> = ({ text, size, color, bg }) => {
  const { d, n } = qrPath(text);
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" style={{ display: 'block', background: bg }}>
      <path d={d} fill={color} />
    </svg>
  );
};
```

```tsx
// remotion/promo4/fx/PinField.tsx
import React from 'react';
import { C, FONT } from '../brand';
import { prog, E, spr, rand, mix, fd } from '../lib/anim';
import { SPX } from './springs';
import { chitPath } from './Chit';
import { Qr } from './Qr';
import { STATION } from '../data';

// Stations: names belong in data.ts (dash free) before this ships; positions in world px on a loose 4 x 3 grid, seeded offsets
export const PINS = ['Pizza oven', 'Fryer', 'Walk in cool room', 'Pass', 'Dish', 'Bar', 'Grill', 'Prep bench', 'Dry store', 'Front door'].map((name, i) => ({
  name, x: 260 + (i % 4) * 460 + (rand(`px${i}`) - 0.5) * 120, y: 220 + Math.floor(i / 4) * 380 + (rand(`py${i}`) - 0.5) * 90,
}));
export const PIN = { w: 170, h: 150 };

/** dropAt[i]: frame pin i starts falling; contact 6 f later on E.contact, then SPX.pin settles (no visible overshoot). */
export const PinField: React.FC<{ frame: number; dropAt: number[]; picked: number; pickAt: number; hover: number }> = ({ frame: f, dropAt, picked, pickAt, hover }) => (
  <>
    {PINS.map((p, i) => {
      const t0 = dropAt[i];
      const fall = prog(f, t0, t0 + 6, E.contact); // arrives with speed
      const settle = f > t0 + 6 ? spr(f, t0 + 6, SPX.pin) : 0;
      const y = mix(-90, 0, fall) + (f > t0 + 6 ? (1 - settle) * 4 : 0);
      const shadow = fall; // shadow grows as the pin nears the ground: depth without 3D
      const isPick = i === picked;
      const dim = fd(f) >= pickAt && !isPick ? prog(f, pickAt, pickAt + 10, E.smooth) : 0;
      const lift = isPick ? hover : 0; // hover enlarges the picked pin 8 %
      return fall <= 0 ? null : (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${p.x}px, ${p.y}px, 0)`, opacity: 1 - 0.6 * dim }}>
          <div style={{ position: 'absolute', left: PIN.w * 0.1, top: PIN.h + 34, width: PIN.w * 0.4, height: 14, borderRadius: '50%',
            background: 'rgba(31,27,22,0.22)', transform: `scale(${mix(0.4, 1, shadow)})`, opacity: shadow }} />
          <div style={{ transformOrigin: `${17 * PIN.h / 46}px ${PIN.h + 13 * PIN.h / 46}px`, transform: `translate3d(0, ${y.toFixed(2)}px, 0) scale(${1 + 0.08 * lift})` }}>
            <svg width={PIN.w} height={PIN.h + 44} style={{ position: 'absolute', overflow: 'visible' }}><path d={chitPath(PIN.w, PIN.h)} fill={C.saffron} /></svg>
            <div style={{ position: 'absolute', left: 40, top: 22 }}><Qr text={STATION.qrTarget} size={104} color={C.ink} bg={C.saffron} /></div>
          </div>
          <div style={{ position: 'absolute', left: 0, top: PIN.h + 58, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.06em', color: C.ink, opacity: prog(f, t0 + 6, t0 + 14, E.smooth) }}>
            {p.name.toUpperCase()}
          </div>
        </div>
      );
    })}
  </>
);
```

Drop timing: put the drops on 16ths with a seeded 0 to 3 f spread (`b(bar, beat, sub) + Math.floor(rand('d'+i) * 4)`), ordered by when each pin enters the frame during the pull back (compute from `toScreen` of the pin under the shot at each frame, first frame inside the frame minus 8 f). That makes the field feel discovered by the camera, not pre populated.

Pull back shot: `lc(PIZZA_TIGHT, FIELD_WIDE, spr(f, T, SPR.heavy))` where `PIZZA_TIGHT = { ax: pin.x + 60, ay: pin.y + 70, sx: 960, sy: 540, k: 3.2 }` and `FIELD_WIDE = { ax: 1000, ay: 600, sx: 960, sy: 560, k: 0.9 }`. A spring driven camera has no ease in: pre roll it with the outgoing shot's velocity (§8.1) or start it from a held breath.

### 7.2 The pick, and the station page growing from the pin

Cursor arrives on the oven pin (`useGesture`, §6), hover lifts it, press. On the press frame the pin's chit becomes the page's shell: `morphRect(pinRect, pageRect, spr(f, click, SPR.soft))`, radius 22 to 40, fill Saffron to Paper (`mixColor`), and the camera pushes in to frame the page at k 1 on the same spring (`lc(FIELD_WIDE, PAGE_SHOT, s)`), so the page fills the frame as it grows. Contents in stages (shell first, then contents, then the action): station name in mono caps at `contentIn(s)` 0, "What do you need?" mask rise at 0.2, the three cards (Training, FAQs, Troubleshooting) with `SPX.chip` on a 3 f stagger. The other pins are left behind in world space and slide out of frame with the push, which reads as depth without any 3D.

### 7.3 QR scan with viewfinder brackets that lock (0:50.5 to 0:53)

A phone camera view on the station label. The view drifts with a hand held wobble (seeded sum of sines, amplitude decaying to zero at the lock); four L brackets in screen space start loose (scale 1.25, Parchment, 60 % opacity) and snap to the QR's projected bounds with a clamped detent spring, turn Saffron, a single scan line sweeps, then the lock pulses once.

```tsx
// remotion/promo4/fx/Viewfinder.tsx
import React from 'react';
import { C } from '../brand';
import { spr, SPR, prog, E, mix, hitPulse, rand } from '../lib/anim';
import { mixColor } from '../lib/color';

/** Hand held wobble in px at frame f: three seeded sines, 0.3 to 1.1 Hz, amplitude `amp`. Pure, repeatable. */
export const handheld = (f: number, amp: number, seed = 'hh') => {
  const s = (i: number, axis: string) => Math.sin((f / 30) * Math.PI * 2 * (0.3 + 0.4 * i + rand(`${seed}${axis}${i}f`) * 0.2) + rand(`${seed}${axis}${i}p`) * 6.283);
  return { x: amp * (0.6 * s(0, 'x') + 0.3 * s(1, 'x') + 0.1 * s(2, 'x')), y: amp * (0.6 * s(0, 'y') + 0.3 * s(1, 'y') + 0.1 * s(2, 'y')) };
};

export const Viewfinder: React.FC<{ frame: number; lockAt: number; target: { x: number; y: number; w: number; h: number } /* screen px */ }> = ({ frame: f, lockAt, target }) => {
  const s = spr(f, lockAt - 6, { ...SPR.detent, overshootClamping: true }); // clamped: brackets never cross the code
  const loose = { w: target.w * 1.35, h: target.h * 1.35 };
  const w = mix(loose.w, target.w + 24, s), h = mix(loose.h, target.h + 24, s);
  const cx = target.x + target.w / 2, cy = target.y + target.h / 2;
  const col = mixColor(C.parchment, C.saffron, prog(f, lockAt - 1, lockAt + 4, E.ui));
  const pulse = 1 + 0.04 * hitPulse(f - lockAt, 2, 5);
  const L = 54, T = 6;
  const corner = (sx: number, sy: number) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: L, height: L, transformOrigin: '0 0',
      transform: `translate3d(${(cx + sx * w * pulse / 2).toFixed(2)}px, ${(cy + sy * h * pulse / 2).toFixed(2)}px, 0) scale(${sx}, ${sy})`,
      borderLeft: `${T}px solid ${col}`, borderTop: `${T}px solid ${col}`, borderTopLeftRadius: 14 }} />
  );
  const scan = prog(f, lockAt + 2, lockAt + 14, E.smooth);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: mix(0.6, 1, s) }}>
      {corner(-1, -1)}{corner(1, -1)}{corner(-1, 1)}{corner(1, 1)}
      {scan > 0 && scan < 1 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: target.w, height: 3, background: C.saffron, opacity: Math.sin(Math.PI * scan),
          transform: `translate3d(${target.x}px, ${(target.y + target.h * scan).toFixed(2)}px, 0)` }} />
      )}
    </div>
  );
};
```

* Camera view: the label (QR plus "Scan for training") is world content under `camera(shot)` with `shot.sx/sy` offset by `handheld(f, mix(8, 0, prog(f, lockAt - 10, lockAt, E.out)))`. The brackets read the label's projected rect with `toScreen`, so they chase the wobble until the lock, then the wobble is already zero.
* The lock is the scan's cause; on `lockAt + 8` the view zooms through the code (§8.3) into the station page. No "no login" implication: the page that arrives shows a signed in staff header.
* Sound: a soft two note chime on `lockAt`, not a beep.

---

## 8. Seams (no crossfade as a default)

Proposed seam plan for Version B (each type used at most twice; the signature move, the chit dropping into place, opens, sits in the middle and closes):

| At | From to | Seam | Notes |
|---|---|---|---|
| 0:07 | Hook to phone | Velocity handoff, vertical | The stack lifts out of the top on `E.exit`; the phone's notification drops in from the top at the same px/f (§8.1) |
| 0:13 | Phone to Ask Larder | Reveal by subtraction plus match cut (landing #1) | §3. The signature move, middle |
| 0:21.5 | 3a to 3b | Word roll on the caption | Panel holds; "Ask another question" resets the field |
| 0:28.5 | Ask Larder to forms | Velocity handoff, horizontal | The fridges chit enters on the whip (`E.whip`, `dip()` on k) |
| 0:30 | Forms hub | Word roll | "Every shift / day / week", headings light in step |
| 0:45.5 | Forms to oven question | Zoom through | Through the saved record chit (§8.3) |
| 0:50.5 | Oven to stations | Pin field pull back | §7 |
| 1:01 | Stations to urgency | Horizon rise | Ink disc (§8.2) |
| 1:07 | Urgency to CTA | Bubble becomes the mark (landing #2) | The signature move, close |

### 8.1 Velocity handoff cut

Measure the outgoing speed at the cut from the curve itself and start the incoming move at that speed, decaying. For zooms use `zoomHandoff` (already in `camera.ts`). For pans and lifts, `inertia()` (in `anim.ts`) is the closed form:

```ts
import { E, prog, inertia } from '../lib/anim';
// outgoing: the stack exits up over 14 f on E.exit, cut on its last frame
const OUT = { from: CUT - 14, to: CUT, dist: -1300 };
const yOut = (f: number) => OUT.dist * prog(f, OUT.from, OUT.to, E.exit);
const v0 = yOut(CUT) - yOut(CUT - 1); // px/f at the cut (negative: upward). E.exit ends fast, so this is its peak
// incoming: the phone world continues at v0 and coasts to rest (0.89 per 60 fps frame)
const inc = (f: number) => inertia(f, CUT, v0, 0.89); // .x travel since the cut, .total final travel
// place the incoming content so it RESTS at its layout spot: y = restY - inc.total + inc(f).x
```

Same screen direction, same speed on both sides of the cut; the first incoming frame already moves. At 30 fps the cut frame speed will be 60 to 120 px/f: blur both sides of the cut (§9.2), never across it.

### 8.2 Horizon rise disc (stations to urgency)

```tsx
// An Ink disc whose top edge rises from below the frame like a horizon, then covers. The curve
// reads as a planet edge, not a wipe. Text for the urgency beat rides ON the disc (it is the next scene).
export const HorizonRise: React.FC<{ frame: number; at: number; dur?: number; color: string; children?: React.ReactNode }> = ({ frame: f, at, dur = 28, color, children }) => {
  const R = 2400; // disc radius, px (curvature: smaller is rounder)
  const t = prog(f, at, at + dur, E.cam);
  const top = mix(1080 + 40, -R * 0.08, t); // y of the disc's top edge; ends past the top so it covers
  const scale = mix(1, 1.6, t); // grows as it rises so the edge flattens into a full cover
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * R, height: 2 * R, borderRadius: '50%', background: color, transformOrigin: '50% 0',
      transform: `translate3d(${960 - R}px, ${top.toFixed(2)}px, 0) scale(${scale.toFixed(4)})` }}>
      {children}
    </div>
  );
};
```

While it rises the outgoing scene sinks 40 px and dims 20 % (parallax: the horizon is nearer than the scene). One kick at full cover. A large `border-radius: 50%` div is cheap; avoid an SVG `<circle>` with a filter.

### 8.3 Zoom through

Exit: scale 1 to 1.2 on `E.in` over 6 f (12 at 60) with blur 0 to 10 px on ONE wrapper. Cut on the last frame. Entry: `zoomHandoff(t, v0, 15)` (30 at 60), where `v0 = zoomSpeed(kOut, CUT - 1)`; it starts at about 0.76 x and settles. Full frame blur on a big layer steps (trap 3): crossfade a sharp copy and a constant 18 px copy over the 6 f instead of animating the radius.

### 8.4 Word roll seam

The last word of the outgoing caption rolls (§5.2) into the first word of the incoming one in the same mask, while the picture behind changes on the roll's middle frame, under the type. The type carries the eye across the cut.

### 8.5 Bans for this film

No crossfade as a default (a 6 to 7 f crossfade is allowed only as a component inside a designed seam, like the zoom through's sharp to blurred copy). No dissolve through black. No preset wipes. No two seams of the same type back to back.

---

## 9. Motion blur at 30 fps

**What is installed:** nothing for blur. `@remotion/motion-blur` (`<Trail>`, `<CameraMotionBlur>`) is not in `node_modules` and must not be installed. The starter's `blur.ts` relies on `accumulate.py` and `measure-speed.py` (Python, not available here). `Freeze` from core `remotion` accepts fractional frames (it only checks the value is finite; it overrides the timeline frame for `useCurrentFrame` inside it).

**Where blur is needed:** at 30 fps anything over about 12 px/f strobes. In this film: the hook exit (§8.1, 60 to 120 px/f), the subtraction pieces (up to 160 px/f), the whips (§8 at 0:28.5), the pin drops' last frames, the zoom through. Everything else (reading text, UI arrivals under 12 px/f) stays sharp.

### 9.1 In browser sub frame samples (the general fallback)

Because every component takes a `frame` prop, a blurred element is N copies at fractional frames across a 180 degree shutter. Stacking copy i (0 based, painted bottom to top) at opacity 1/(i+1) gives an exact equal weight average for opaque content.

```tsx
// remotion/promo4/fx/SubSamples.tsx
import React from 'react';
/** Wrap ONLY the moving subtree. n = 1 renders once; pick n from the measured speed: ceil(px_per_f / 12), max 5. */
export const SubSamples: React.FC<{ frame: number; n: number; shutter?: number; lo?: number; hi?: number; render: (f: number) => React.ReactNode }> = ({ frame, n, shutter = 180, lo = -Infinity, hi = Infinity, render }) => {
  if (n <= 1) return <>{render(frame)}</>;
  const span = shutter / 360;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const t = Math.min(hi, Math.max(lo, frame + span * ((i + 0.5) / n - 0.5))); // clamp inside the act: cuts stay crisp
        return <div key={i} style={{ position: 'absolute', inset: 0, opacity: 1 / (i + 1) }}>{render(t)}</div>;
      })}
    </>
  );
};
// usage: <SubSamples frame={f} n={speed(f) > 12 ? 4 : 1} lo={ACT.hook.from} hi={ACT.hook.to - 1e-3} render={(t) => <HookStack frame={t} />} />
// for a third party component that reads useCurrentFrame(): render={(t) => <Freeze frame={t}><Thing /></Freeze>}
```

* Compute `speed(f)` from the same curve that moves the element (for example `Math.abs(yOut(f) - yOut(f - 1))`), so n is known per frame without optical flow.
* Discrete state inside uses `fd(frame)`, so 4 samples of one output frame agree (no doubled carets, no half typed letters: trap 11).
* Quality: each sample is quantised to 8 bits before compositing, so edges get a slight ring; on short whips (6 to 14 f) it reads as real blur. For semi transparent elements over a background the weights are close, not exact.
* Cost: N x the DOM and paint of that subtree only, for those frames only. At n = 4 on a 14 f whip, about 40 extra subtree renders, negligible against the film.

### 9.2 Cheaper still: stretch along velocity

For small solid things (chits, pins, the cursor, subtraction pieces): rotate into the velocity, scale along it by `1 + clamp(v / 60) * 0.35`, compensate across by `1 / sqrt(stretch)`, rotate back (exactly as in §3.1). One DOM copy, no filter. A directional SVG blur (`feGaussianBlur stdDeviation="8 0"` inside a rotated wrapper) also works but is a filter on an HTML layer: slower and its radius steps (trap 16). Prefer the stretch, or samples.

### 9.3 Offline true blur (only if render time allows)

Render a 120 fps twin composition (`FilmSub`: same acts, `frame = subFrame / 4`) for just the frame ranges that need blur (`--frames=a-b`), then average each group of 4 in float in Node with `sharp` (`.raw()` buffers, sum into a `Float32Array`, divide, round once) and splice the frames into the master. `sharp` is installed. Cost: 4 x the render time of those ranges (about 3 to 5 s of the film), roughly +15 to 25 % of a full render. Never average across an act boundary.

---

## 10. Film grain at 1.5 percent from seeded tiles

Grain gives the flat Parchment fields a surface and dithers gradients (kills banding, trap 8). It is a screen space layer, above everything, never under the camera (scaled grain goes soft and swims). Two tiles per variant from the same seeded noise: an additive layer for the positive half (`mix-blend-mode: plus-lighter`) and a multiply layer for the negative half. This keeps the grain visible on light Parchment (where `overlay` and `soft-light` fall to about a quarter of their midtone strength) and keeps the mean brightness on brand.

Tile generator (Node, `sharp`, no Python), run once, output to `remotion/public-promo4/grain/`:

```js
// scripts/make-grain.mjs: 8 variants x 2 tiles, 512 x 512, seeded. Amplitude: std 1.5 % of full scale.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const OUT = 'remotion/public-promo4/grain'; mkdirSync(OUT, { recursive: true });
const N = 512, AMP = 0.015 * 255; // 1.5 % of full scale per unit of noise
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (let v = 0; v < 8; v++) {
  const r = mulberry(4700 + v);
  const g = new Float32Array(N * N);
  for (let i = 0; i < N * N; i += 2) { // Box Muller: two normals per pair
    const u = Math.max(1e-9, r()), w = r(), m = Math.sqrt(-2 * Math.log(u));
    g[i] = m * Math.cos(2 * Math.PI * w); g[i + 1] = m * Math.sin(2 * Math.PI * w);
  }
  // soften to a ~1.3 px grain: 3 tap box blur, wrapping, so the tile still tiles seamlessly
  const s = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let acc = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) acc += g[((y + dy + N) % N) * N + ((x + dx + N) % N)];
    s[y * N + x] = (acc / 9) * 3; // box of 9 shrinks std by 3: restore it
  }
  const add = Buffer.alloc(N * N), mul = Buffer.alloc(N * N);
  for (let i = 0; i < N * N; i++) {
    add[i] = Math.min(255, Math.round(Math.max(0, s[i]) * AMP)); // plus lighter: black adds nothing
    mul[i] = 255 - Math.min(255, Math.round(Math.max(0, -s[i]) * AMP)); // multiply: white changes nothing
  }
  const save = (buf, name) => sharp(buf, { raw: { width: N, height: N, channels: 1 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}${v}.png`);
  await save(add, 'add'); await save(mul, 'mul');
}
```

```tsx
// remotion/promo4/fx/Grain.tsx: last child of the film's root, outside every camera
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { fd, rand } from '../lib/anim';

export const Grain: React.FC<{ frame: number; strength?: number }> = ({ frame, strength = 1 }) => {
  const F = fd(frame); // whole frame: blur sub samples share one grain field
  const v = Math.floor(rand(`gv${F}`) * 8);
  const ox = Math.floor(rand(`gx${F}`) * 256) * 2, oy = Math.floor(rand(`gy${F}`) * 256) * 2; // whole px offsets: no resampling
  const layer = (kind: 'add' | 'mul', blend: React.CSSProperties['mixBlendMode']) => (
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`grain/${kind}${v}.png`)})`, backgroundSize: '512px 512px',
      backgroundPosition: `${-ox}px ${-oy}px`, mixBlendMode: blend, opacity: strength, pointerEvents: 'none' }} />
  );
  return <>{layer('add', 'plus-lighter')}{layer('mul', 'multiply')}</>;
};
```

* `staticFile('grain/...')` assumes the render's `publicDir` is `remotion/public-promo4` (where `audio`, `cap` and `fonts` already live); adjust the prefix if the lead wires it differently.
* A new variant and offset every frame (30 per second) reads as fine film grain. Tile images are 16 small PNGs (about 60 to 120 KB each), decoded once and cached: near zero render cost. Preload them in a `<FontGate>`-style `delayRender` gate so frame 0 has grain.
* Encoding: grain costs bitrate. For the master, encode at CRF 14 to 16. For the landing page web encode, drop `strength` to 0.7 or the encoder will smear it into blotches; check a 1:1 crop of a Parchment field in the final MP4, not in the PNG frames.
* Never put grain under `mix-blend-mode` inside a `transform`ed or `filter`ed ancestor: blending isolates at the group boundary and the grain would only blend with that group.

---

## 11. Render cost and 30 fps gotchas (checklist)

1. **Springs are fast at 30 fps.** `snap`, `pop`, `land` reach 97 % in 5 frames; use `SPX.landCalm` (9 f to contact, 8 % overshoot) for the two landings and the critically damped set elsewhere.
2. **Halve the 60 fps references, then round up for anything read.** Fades 6 to 7 f minimum on `E.smooth`; mask rise 15 f; stagger 3 f; press 2 f down and 4 f up; typing box about 36 to 42 f. Use `f60()` when porting a number.
3. **Slow vertical text stair-steps** (trap 15): end every vertical text move with `arrive(p, arriveK(px, dur))`; keep read text drifting under 1.5 px/f; prefer horizontal drift for text in holds.
4. **Strobing above about 12 px/f:** blur those frames (§9) or shorten them. A 30 fps whip should last 6 to 10 f, not 3.
5. **No animated `filter: blur()` on big layers:** it steps and is slow. Blur only text sized wrappers, and for full frame use the sharp plus constant blur copy crossfade.
6. **No `will-change` anywhere blur animates** (ghost frames, trap 4).
7. **Shadows:** large `box-shadow` blur radii on many moving elements are expensive per frame. One soft shadow per hero (phone, panel), flat Ink at low alpha elsewhere; the pin shadows are scaled ellipses, not blurred shadows.
8. **QR codes:** one SVG path per code (`qrPath`), `shapeRendering="crispEdges"`, cached by text. Ten pins with rect per module QRs would be about 6000 DOM nodes.
9. **Text under scale:** text rasterises at its layout size. Where the camera pushes past k 1.5 on UI text, lay the act out at shot scale (CSS `zoom`) and counter scale the camera (trap 2), or keep UI type at least 22 px on screen at the widest shot and at most k 2.5 on it.
10. **No 3D unless needed:** the plan here is flat (depth by parallax, scale and shadow). If a tilt is added, roll stays outside the tilt (trap 9) and no `overflow: hidden` inside `preserve-3d` (trap 7).
11. **Determinism:** no `Math.random`, `Date.now`, CSS `transition` or `animation`; every value is a function of `frame` and seeded `rand()`. The typing dots and wobble above are pure sines of the frame.
12. **Fonts:** gate the first frame on Space Grotesk, Inter and IBM Plex Mono loading (`delayRender` until `document.fonts` reports each face), or text boxes size to the fallback.
13. **Concurrency:** about 2250 frames for 75 s. Mostly DOM and SVG, so render time is dominated by paint of the large Parchment fields and shadows; expect a few frames per second per worker. Sub sample blur (§9.1) adds only on the 3 to 5 s of fast frames.
14. **Gradients band** in 8 bit; the grain layer dithers them, but keep large soft gradients out of the design (flat brand fields read better anyway).
