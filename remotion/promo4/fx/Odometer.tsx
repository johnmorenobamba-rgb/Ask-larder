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
