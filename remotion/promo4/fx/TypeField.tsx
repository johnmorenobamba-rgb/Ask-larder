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
