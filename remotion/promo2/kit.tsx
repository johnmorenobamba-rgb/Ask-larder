import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO, easeInOut, easeOut } from "../v2/brand";

// Promo v2 kit. Motion rules: springs for everything that enters, bezier easing for
// moves inside the frame, nothing linear. Everything is derived from the frame number.

export const PAGE_BG = "#EBE0CB"; // Parchment mixed 6 percent toward Clay: the working surface, so Parchment screens separate from it
export const INK_SOFT = "rgba(31,27,22,0.78)";

export const SPR = {
  text: { damping: 26, stiffness: 170, mass: 0.8 },
  surface: { damping: 28, stiffness: 140, mass: 0.9 },
  camera: { damping: 30, stiffness: 90, mass: 1 },
  stamp: { damping: 15, stiffness: 260, mass: 0.7 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const useSpring = (delay: number, config = SPR.text) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

// ---------------------------------------------------------------- camera
export type CamKey = { at: number; s: number; fx: number; fy: number };
export type Cam = { s: number; tx: number; ty: number };

/** Camera over a w x h surface. fx, fy are the point of interest in 0..1 content coordinates. Translate is clamped so the content always covers the frame. */
export function useCam(keys: CamKey[], w: number, h: number): Cam {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let s = keys[0].s;
  let fx = keys[0].fx;
  let fy = keys[0].fy;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const p = spring({ frame: frame - k.at, fps, config: SPR.camera });
    s = Math.exp(lerp(Math.log(s), Math.log(k.s), p));
    fx = lerp(fx, k.fx, p);
    fy = lerp(fy, k.fy, p);
  }
  return {
    s,
    tx: clamp(w / 2 - fx * w * s, w - w * s, 0),
    ty: clamp(h / 2 - fy * h * s, h - h * s, 0),
  };
}

export const toScreen = (cam: Cam, w: number, h: number, nx: number, ny: number) => ({
  x: nx * w * cam.s + cam.tx,
  y: ny * h * cam.s + cam.ty,
});

// ---------------------------------------------------------------- surface: a screen sitting on the page
export const SHADOW_ON_PARCHMENT = [
  "0 1px 1px rgba(31,27,22,0.06)",
  "0 4px 8px rgba(31,27,22,0.06)",
  "0 16px 32px rgba(31,27,22,0.08)",
  "0 40px 80px -12px rgba(31,27,22,0.16)",
].join(", ");

export const Viewport: React.FC<{
  x: number; y: number; w: number; h: number; cam: Cam; entryDelay?: number; radius?: number; pressY?: number;
  children: React.ReactNode; overlay?: React.ReactNode;
}> = ({ x, y, w, h, cam, entryDelay = 0, radius = 24, pressY = 0, children, overlay }) => {
  const p = useSpring(entryDelay, SPR.surface);
  const scale = 0.96 + 0.04 * p;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h,
        opacity: clamp(p * 1.6, 0, 1),
        transform: `translateY(${(1 - p) * 28 + pressY}px) scale(${scale})`,
        borderRadius: radius, boxShadow: `${SHADOW_ON_PARCHMENT}, 0 0 0 1px rgba(31,27,22,0.10)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", background: C.parchment }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})` }}>
          {children}
        </div>
        {overlay}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- cursor and click ripple
export type Waypoint = { at: number; x: number; y: number };

function cursorPos(frame: number, pts: Waypoint[]) {
  if (frame <= pts[0].at) return { x: pts[0].x, y: pts[0].y };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (frame <= b.at) {
      const t = easeInOut(clamp((frame - a.at) / (b.at - a.at), 0, 1));
      const dx = b.x - a.x, dy = b.y - a.y;
      const bend = 0.07 * Math.sin(Math.PI * t); // arc, not a straight line
      return { x: lerp(a.x, b.x, t) - dy * bend, y: lerp(a.y, b.y, t) + dx * bend };
    }
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}

/** Cursor, press and ripples. Coordinates are 0..1 in content space; this renders in screen space of the viewport so it stays the same size when the camera zooms. */
export const Cursor: React.FC<{ pts: Waypoint[]; clicks: { at: number; color?: string }[]; cam: Cam; w: number; h: number; fadeOutAt?: number }> = ({ pts, clicks, cam, w, h, fadeOutAt }) => {
  const frame = useCurrentFrame();
  const pos = cursorPos(frame, pts);
  const scr = toScreen(cam, w, h, pos.x, pos.y);
  const inO = interpolate(frame, [pts[0].at - 6, pts[0].at + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outO = fadeOutAt === undefined ? 1 : interpolate(frame, [fadeOutAt, fadeOutAt + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = clicks.reduce((m, c) => {
    const d = frame - c.at;
    if (d < 0 || d > 9) return m;
    return Math.min(m, d < 3 ? lerp(1, 0.9, d / 3) : lerp(0.9, 1, (d - 3) / 6));
  }, 1);
  return (
    <>
      {clicks.map((c, i) => {
        const d = frame - c.at;
        if (d < 0 || d > 14) return null;
        const t = easeOut(d / 14);
        const cpos = toScreen(cam, w, h, ...(() => { const q = cursorPos(c.at, pts); return [q.x, q.y] as [number, number]; })());
        const r = lerp(8, 44, t);
        return (
          <div key={i} style={{ position: "absolute", left: cpos.x - r, top: cpos.y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `3px solid ${c.color ?? C.saffron}`, opacity: 0.9 * (1 - t), pointerEvents: "none" }} />
        );
      })}
      <svg width={28} height={40} viewBox="0 0 28 40" style={{ position: "absolute", left: scr.x - 3, top: scr.y - 2, opacity: inO * outO, transform: `scale(${press})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 2px 3px rgba(31,27,22,0.30))", overflow: "visible" }}>
        <path d="M3 2 L3 30 L10 24 L15 36 L20 34 L15 22 L24 22 Z" fill={C.ink} stroke={C.parchment} strokeWidth={2.4} strokeLinejoin="round" />
      </svg>
    </>
  );
};

// ---------------------------------------------------------------- typing
export const Caret: React.FC<{ height: number; color: string; typing: boolean; sinceType: number; width?: number }> = ({ height, color, typing, sinceType, width = 3 }) => {
  const on = typing || sinceType < 8 || Math.floor((sinceType - 8) / 15) % 2 === 1;
  return <span style={{ display: "inline-block", width, height, background: color, marginLeft: 4, verticalAlign: "-0.1em", opacity: on ? 1 : 0 }} />;
};

/** Words that appear one at a time. Hidden words keep their space so the text never reflows. */
export const StreamWords: React.FC<{ words: string[]; times: number[]; frame: number }> = ({ words, times, frame }) => (
  <>
    {words.map((w, i) => {
      const d = frame - times[i];
      const o = clamp(d / 8, 0, 1);
      return (
        <span key={i} style={{ opacity: easeOut(o), filter: `blur(${(1 - o) * 4}px)`, display: "inline-block", whiteSpace: "pre" }}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      );
    })}
  </>
);

// ---------------------------------------------------------------- text blocks
export const RiseLine: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const p = useSpring(delay, SPR.text);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 24}px)`, filter: `blur(${(1 - p) * 8}px)`, ...style }}>{children}</div>
  );
};

export const SaffronRule: React.FC<{ delay: number; width?: number; color?: string }> = ({ delay, width = 64, color = C.saffron }) => {
  const p = useSpring(delay, SPR.text);
  return <div style={{ width: width * p, height: 4, borderRadius: 2, background: color }} />;
};

export const Headline: React.FC<{ lines: string[]; sub?: string; delay?: number; color?: string; subColor?: string }> = ({ lines, sub, delay = 10, color = C.ink, subColor = INK_SOFT }) => (
  <div>
    {lines.map((l, i) => (
      <RiseLine key={l} delay={delay + i * 5} style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: "100px", letterSpacing: "-0.02em", color }}>{l}</RiseLine>
    ))}
    <div style={{ height: 28 }} />
    <SaffronRule delay={delay + lines.length * 5 + 4} />
    {sub ? (
      <>
        <div style={{ height: 28 }} />
        <RiseLine delay={delay + lines.length * 5 + 10} style={{ fontFamily: FONT_BODY, fontSize: 36, lineHeight: "48px", color: subColor, maxWidth: 620 }}>{sub}</RiseLine>
      </>
    ) : null}
  </div>
);

export const MonoNote: React.FC<{ text: string; color?: string; delay?: number }> = ({ text, color = C.clay, delay = 20 }) => {
  const p = useSpring(delay, SPR.text);
  return <div style={{ position: "absolute", left: 160, bottom: 54, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", color, opacity: 0.9 * p }}>{text}</div>;
};

// ---------------------------------------------------------------- The Stamp (trust moments only)
/** Same geometry as src/components/staff/Stamp.tsx (two Preserve Red rings), with a word prop and a physical land. `frame` is local to the trigger. */
export const Stamp: React.FC<{ frame: number; word: string; size?: number }> = ({ frame, word, size = 220 }) => {
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: SPR.stamp });
  const scale = 1.4 - 0.4 * p;
  const rot = -9 + 6 * p;
  const opacity = interpolate(frame, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outerW = interpolate(frame, [0, 2, 10], [3, 5, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const innerO = interpolate(frame, [2, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pool = interpolate(frame, [0, 3, 9], [0, 0.07, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringT = clamp((frame - 2) / 16, 0, 1);
  return (
    <div style={{ width: size, height: size, position: "relative", transform: `scale(${scale}) rotate(${rot}deg)`, opacity }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", position: "absolute", inset: 0 }}>
        <circle cx={50} cy={50} r={46} fill={`rgba(178,58,44,${pool})`} />
        {frame >= 2 ? <circle cx={50} cy={50} r={lerp(46, 70, easeOut(ringT))} fill="none" stroke={C.red} strokeWidth={1} opacity={0.3 * (1 - ringT)} /> : null}
        <circle cx={50} cy={50} r={46} fill="none" stroke={C.red} strokeWidth={outerW} />
        <circle cx={50} cy={50} r={38} fill="none" stroke={C.red} strokeWidth={1.5} opacity={innerO} />
        <text x={50} y={55} textAnchor="middle" fontSize={11} fontFamily={FONT_MONO} fontWeight={500} fill={C.red} letterSpacing={0.5}>{word}</text>
      </svg>
    </div>
  );
};

/** Camera press for the Stamp: y only, a few pixels, over ten frames. */
export const stampPressY = (frame: number) => interpolate(frame, [0, 2, 4, 6, 8, 10], [0, 6, -3, 2, -1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
