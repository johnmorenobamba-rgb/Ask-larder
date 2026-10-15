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
