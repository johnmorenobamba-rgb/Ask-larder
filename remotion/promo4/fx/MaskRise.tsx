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
