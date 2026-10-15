// Act 3, bars 13 to 14: the second question arrives on the Ask act's whip, and the forms pile up:
// "Every shift" rolls to "Every day" to "Every week".
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../brand';
import { E, prog, inertia, mix } from '../lib/anim';
import { breath } from '../lib/camera';
import { Q } from '../data';
import { ACT, CUE } from '../timeline';
import { Chit } from '../fx/Chit';
import { WordRoll } from '../fx/WordRoll';
import { SubSamples } from '../fx/SubSamples';

const A = ACT.pain2.from;
const L = (abs: number) => abs - A;
export const P2 = { chit: { w: 960, h: 150, x: 480, rest: 250 } };
/** The chit enters moving up at the whip's speed and coasts to rest (velocity handoff). */
const chitY = (f: number) => {
  const v0 = -70; // px per frame upward at the cut, about the whip's exit speed
  const c = inertia(f, 0, v0, 0.89);
  return P2.chit.rest - c.total + c.x;
};
/** Screen centre of the chit at act frame f (the forms act opens its iris from here). */
export const pain2ChitCentre = (f: number) => ({ x: P2.chit.x + P2.chit.w / 2, y: chitY(f) + P2.chit.h / 2 });

const ChitAt: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: 'absolute', left: P2.chit.x, top: 0, transform: `translate3d(0, ${chitY(f).toFixed(2)}px, 0)`, width: P2.chit.w, height: P2.chit.h + 42 }}>
    <Chit w={P2.chit.w} h={P2.chit.h} text={Q.fridges} size={58} />
  </div>
);

export const Pain2Scene: React.FC<{ f: number }> = ({ f }) => {
  const k = breath(prog(f, 0, ACT.pain2.dur, E.smooth), 0.04);
  const speed = Math.abs(chitY(f) - chitY(f - 1));
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ transformOrigin: '50% 45%', transform: `scale(${k.toFixed(5)})` }}>
        <SubSamples frame={f} n={speed > 14 ? 4 : 1} lo={0} hi={ACT.pain2.dur - 1e-3} render={(t) => <ChitAt f={t} />} />
        <div style={{ position: 'absolute', left: 470, top: 600, opacity: prog(f, L(CUE.roll1) - 2, L(CUE.roll1) + 6, E.smooth) }}>
          <WordRoll frame={f} fixed="Every" words={['shift.', 'day.', 'week.']} at={[L(CUE.roll1), L(CUE.roll2), L(CUE.roll3)]} size={168} color={C.parchment} accent={C.saffron} per={1} dur={10} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Pain2: React.FC = () => {
  const f = useCurrentFrame();
  return <Pain2Scene f={f} />;
};
export const _u = { mix };
