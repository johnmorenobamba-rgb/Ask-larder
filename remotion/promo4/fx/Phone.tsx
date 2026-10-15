// remotion/promo4/fx/Phone.tsx
import React from 'react';
import { C, FONT } from '../brand';

export const PW = 620, PH = 1280; // world px; 19.5:9 ish
export const SCREEN = { x: 22, y: 22, w: PW - 44, h: PH - 44, r: 82 };

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: PH, borderRadius: 104, background: '#141210', // a shade under the Ink stage so the phone reads as an object
    boxShadow: `inset 0 0 0 2px ${C.clay}, 0 40px 80px -30px rgba(31,27,22,0.45)` }}>
    <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, borderRadius: SCREEN.r,
      overflow: 'hidden', background: '#2A241D' /* ink lifted 6 %: a screen, not a hole */ }}>
      {children}
      {/* island */}
      <div style={{ position: 'absolute', left: SCREEN.w / 2 - 70, top: 18, width: 140, height: 40, borderRadius: 20, background: C.ink }} />
    </div>
  </div>
);

export const LockClock: React.FC<{ time: string; day: string; yieldT: number }> = ({ time, day, yieldT }) => (
  // yieldT 0..1: the clock steps back when the first notification lands (dims, rises 18 px, shrinks 4 %)
  <div style={{ position: 'absolute', left: 0, top: 150, width: SCREEN.w, textAlign: 'center', color: C.parchment,
    transform: `translate3d(0, ${(-18 * yieldT).toFixed(3)}px, 0) scale(${1 - 0.04 * yieldT})`, opacity: 1 - 0.4 * yieldT }}>
    <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: '0.04em', opacity: 0.8 }}>{day}</div>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 168, lineHeight: 1, letterSpacing: '-0.03em' }}>{time}</div>
  </div>
);
