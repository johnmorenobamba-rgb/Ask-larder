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
