// remotion/promo4/fx/MaskRise.tsx
// Kinetic line type. Two entrances:
//  'slam' (the default since 15 Oct 2026, "more dynamic, explosive"): each word lands from 1.55x with a
//    motion blur, overshoots a little past its size and settles; words two frames apart.
//  'rise': the original calm mask rise, kept for anything that should stay quiet.
import React from 'react';
import { FONT, C } from '../brand';
import { arrive, arriveK, blurIn, depart, E, mix, prog, spr } from '../lib/anim';
import { mixColor } from '../lib/color';

const SLAM = { damping: 13, stiffness: 260, mass: 0.6 }; // about 12 % overshoot, settled in about 14 f

export const MaskRise: React.FC<{
  text: string; frame: number; start: number; size: number; family?: string; weight?: number; lead?: number;
  stagger?: number; dur?: number; out?: number; outDur?: number; blur?: number; color?: string; align?: 'left' | 'center';
  variant?: 'slam' | 'rise';
}> = ({ text, frame: f, start, size, family = FONT.display, weight = 700, lead = 1.08, stagger, dur = 15, out, outDur = 8, blur = 0, color = C.ink, align = 'center', variant = 'slam' }) => {
  const slam = variant === 'slam';
  const st = stagger ?? (slam ? 2 : 3);
  const pad = { t: 0.12, b: 0.26, x: 0.1 };
  const travel = lead + pad.t + pad.b; // em
  const ka = arriveK(travel * size, dur, E.out);
  let k = -1;
  return (
    <div style={{ fontFamily: family, fontWeight: weight, fontSize: size, lineHeight: lead, letterSpacing: '-0.02em', textAlign: align, display: 'flex', flexDirection: 'column' }}>
      {text.split('\n').map((line, li) => (
        <div key={li} style={slam ? undefined : { overflow: 'hidden', padding: `${pad.t}em ${pad.x}em ${pad.b}em`, margin: `-${pad.t}em -${pad.x}em -${pad.b}em` }}>
          {line.split(' ').map((w, wi, arr) => {
            k++;
            const s = start + k * st;
            const q = out === undefined ? 0 : prog(f, out + k * (st / 2), out + k * (st / 2) + outDur, E.in);
            const p = prog(f, s, s + dur, E.out);
            let transform: string, opacity = 1, b = 0;
            if (slam) {
              const sp = spr(f, s, SLAM);
              const sc = mix(1.55, 1, sp) * (1 - 0.08 * q);
              const y = (1 - sp) * 0.3 - q * 0.45; // em
              opacity = prog(f, s - 1, s + 3, E.smooth) * (1 - q);
              b = 12 * (1 - prog(f, s, s + 7, E.out)) + 8 * q;
              transform = `translateY(${y.toFixed(4)}em) scale(${sc.toFixed(4)})`;
            } else {
              const y = (1 - arrive(p, ka)) * travel - depart(q) * travel;
              b = blur > 0 ? blurIn(p, blur) : 0;
              transform = `translateY(${y.toFixed(4)}em)`;
            }
            return (
              <span key={wi} style={{ display: 'inline-block', whiteSpace: 'pre', transform, transformOrigin: '50% 70%', opacity,
                color: mixColor(mixColor(color, C.parchment, 0.55), color, Math.min(1, p / 0.7)), // ink resolve on arrival
                filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined, visibility: f < s - 1 || q >= 1 ? 'hidden' : undefined }}>
                {wi < arr.length - 1 ? w + ' ' : w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
