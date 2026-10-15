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
