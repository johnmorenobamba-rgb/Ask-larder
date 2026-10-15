// remotion/promo4/fx/Energy.tsx. The film wide energy layer (15 Oct 2026): camera punches on the music's
// hits and shockwave rings on the drops. Timing comes only from timeline.ts PUNCH and DROPS, the same
// list the audio build reads for its impacts, so a punch always lands on its sound.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../brand';
import { E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { PUNCH } from '../timeline';

/** Camera punch at absolute frame F: an instant kick in (one frame), then a fast decay. */
export const punchAt = (F: number) => {
  let k = 1, roll = 0;
  for (const p of PUNCH) {
    const t = F - p.at;
    if (t < -1 || t > 40) continue;
    const h = hitPulse(t + 1, 2, p.tau);
    k += p.amp * h;
    roll += (p.roll ?? 0) * h;
  }
  return { k, roll };
};

/** Wrap one act: the whole frame takes the punch, about the frame centre. `from` is the act's start. */
export const Punch: React.FC<{ F: number; children: React.ReactNode }> = ({ F, children }) => {
  const { k, roll } = punchAt(F);
  if (k === 1 && roll === 0) return <>{children}</>;
  return (
    <AbsoluteFill style={{ transform: `scale(${k.toFixed(5)}) rotate(${roll.toFixed(3)}deg)`, transformOrigin: '50% 50%' }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * A shockwave from a screen point: a thick Saffron ring that thins as it races out, a thin Parchment
 * echo three frames behind it, and a short warm flash at the origin. About two thirds of a second.
 */
export const Shockwave: React.FC<{ F: number; at: number; x: number; y: number; reach?: number; r0?: number; width?: number; color?: string }> = ({ F, at, x, y, reach = 1500, r0 = 24, width = 34, color = C.saffron }) => {
  const t = F - at;
  if (t < -1 || t > 22) return null;
  const ring = (delay: number, w0: number, c: string, o0: number) => {
    const p = prog(F, at - 1 + delay, at + 18 + delay, E.out);
    if (p <= 0 || p >= 1) return null;
    const r = lmix(r0, reach, p);
    const w = mix(w0, 1, p);
    const o = o0 * (1 - prog(F, at + 4 + delay, at + 18 + delay, E.smooth));
    return <circle cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth={w} opacity={o} />;
  };
  const flash = 0.55 * (1 - prog(F, at, at + 9, E.out)) * prog(F, at - 1, at, E.out);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {flash > 0.01 && (
        <div style={{ position: 'absolute', left: x - 420, top: y - 420, width: 840, height: 840, borderRadius: '50%', opacity: flash,
          background: 'radial-gradient(circle, rgba(232,169,59,0.85) 0%, rgba(232,169,59,0.3) 32%, rgba(232,169,59,0) 66%)' }} />
      )}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {ring(0, width, color, 0.95)}
        {ring(3, 8, C.parchment, 0.6)}
      </svg>
    </AbsoluteFill>
  );
};
