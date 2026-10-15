import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, FONT } from '../brand';
import { E, prog, lmix, clamp } from '../lib/anim';
import { camera, type Shot } from '../lib/camera';
import { MaskRise } from '../fx/MaskRise';
import { copy } from '../timeline';

/** A caption from timeline COPY, in screen space on the lower third. `dark` = Ink stage. Leaves by rising out with the cut. */
export const Caption: React.FC<{ id: string; frame: number; act: number; dark?: boolean; y?: number; size?: number; scrim?: boolean; align?: 'left' | 'center'; x?: number; width?: number }> = ({ id, frame: f, act, dark, y = 900, size = 60, scrim, align = 'center', x = 120, width }) => {
  const c = copy(id);
  const inL = c.in - act + 1;
  const outL = c.out - act - 8;
  const vis = f >= inL - 1 && f <= outL + 14;
  if (!vis) return null;
  const bandO = scrim ? prog(f, inL - 4, inL + 6, E.smooth) * (1 - prog(f, outL, outL + 12, E.smooth)) : 0;
  return (
    <>
      {scrim && (
        <AbsoluteFill style={{ top: y - 150, height: 1080 - (y - 150), background: `linear-gradient(to bottom, rgba(235,224,203,0) 0%, rgba(235,224,203,0.94) 38%, rgba(235,224,203,0.97) 100%)`, opacity: bandO }} />
      )}
      <div data-text={id} style={{ position: 'absolute', left: x, ...(width ? { width } : { right: 120 }), top: y - size * 0.6, display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        <MaskRise text={c.text} frame={f} start={inL} size={size} color={dark ? C.parchment : C.ink} out={outL < 9999 ? outL : undefined} align={align} />
      </div>
    </>
  );
};

/** The honesty line on every product shot. Small, steady, never animated beyond a fade. */
export const Disclosure: React.FC<{ text: string; frame: number; from: number; to: number; dark?: boolean }> = ({ text, frame: f, from, to, dark }) => (
  <div style={{ position: 'absolute', left: 96, bottom: 52, fontFamily: FONT.mono, fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase', color: dark ? C.parchment : C.clay,
    opacity: 0.55 * prog(f, from, from + 10, E.smooth) * (1 - prog(f, to - 10, to, E.smooth)) }}>{text}</div>
);

/** World content under an anchor camera. */
export const World: React.FC<{ shot: Shot; w: number; h: number; children: React.ReactNode }> = ({ shot, w, h, children }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <div style={{ ...camera(shot), width: w, height: h }}>{children}</div>
  </AbsoluteFill>
);

/** A real capture from the demo venue library, drawn at its CSS size (captures are 2x). */
export const Capture: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties }> = ({ src, w, h, style }) => (
  <Img src={staticFile(`cap/${src}`)} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, ...style }} />
);

const farthest = (x: number, y: number) => Math.hypot(Math.max(x, 1920 - x), Math.max(y, 1080 - y));
/** Iris reveal of the incoming scene from a screen point: radius in log space on E.iris, already moving on its first frame. */
export const Iris: React.FC<{ frame: number; at: number; x: number; y: number; r0?: number; dur?: number; children: React.ReactNode }> = ({ frame: f, at, x, y, r0 = 40, dur = 12, children }) => {
  const t = prog(f, at - 1, at + dur, E.iris);
  const r = t >= 1 ? 9999 : lmix(r0, farthest(x, y) + 4, clamp(t));
  return <AbsoluteFill style={{ clipPath: t >= 1 ? undefined : `circle(${r.toFixed(2)}px at ${x.toFixed(2)}px ${y.toFixed(2)}px)` }}>{children}</AbsoluteFill>;
};
