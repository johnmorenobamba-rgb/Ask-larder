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
