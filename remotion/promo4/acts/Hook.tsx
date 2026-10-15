// Act 1, bars 1 to 6: three staff questions land on the owner's phone, the camera pulls back to show
// it is their day off, and "Sorry to bother you on your day off" arrives. One continuous take.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from '../brand';
import { E, prog, spr, arrive, mix, fd, lmix } from '../lib/anim';
import { breath, lc, toScreen, type Shot } from '../lib/camera';
import { SPX } from '../fx/springs';
import { Chit } from '../fx/Chit';
import { PhoneFrame, PW, PH, SCREEN } from '../fx/Phone';
import { TypingDots } from '../fx/Thread';
import { Odometer } from '../fx/Odometer';
import { PHONE, Q } from '../data';
import { ACT, CUE } from '../timeline';
import { Caption, Disclosure, World } from './common';

const A = ACT.hook.from;
const L = (abs: number) => abs - A;

// ---- the thread: rows stack from the bottom, the newest pushes the rest up (closed form, no measuring)
export const ROW = 162;
const BOTTOM = SCREEN.y + 1060; // world y of the bottom of the newest row
export const CHIT = { w: 520, h: 84 };
type Row = { who: string; text: string; at: number; kind: 'chit' | 'msg'; typingFrom?: number };
export const ROWS: Row[] = [
  { who: 'Felix A.', text: Q.fryer, at: L(CUE.bubble1), kind: 'chit' },
  { who: 'Oscar D.', text: Q.fridges, at: L(CUE.bubble2), kind: 'chit' },
  { who: 'Priya N.', text: Q.cellar, at: L(CUE.bubble3), kind: 'chit' },
  { who: PHONE.from.split(' ')[0] + ' A.', text: PHONE.lines[0], at: L(CUE.notify), kind: 'msg', typingFrom: L(CUE.notify) - 30 },
];
/** Arrival spring of a row: the slot opens when its typing dots start (or when it lands). Started early so it is moving on its cue. */
const slotStart = (r: Row) => (r.typingFrom ?? r.at) - (r.at < 12 ? 14 : 6); // the first row is already moving on frame 0
const slot = (f: number, i: number) => spr(f, slotStart(ROWS[i]), SPX.bubble);
/** World top of row i at frame f. */
export const rowTop = (f: number, i: number) => {
  const lift = ROWS.slice(i + 1).reduce((acc, _r, j) => acc + ROW * slot(f, i + 1 + j), 0);
  return BOTTOM - ROW - lift + (1 - arrive(slot(f, i), 0.96)) * 40;
};
export const CHIT_X = SCREEN.x + 24;

// ---- camera
const SHOT: Record<'close' | 'wide' | 'push', Shot> = {
  close: { ax: CHIT_X + CHIT.w / 2, ay: 842, sx: 960, sy: 430, k: 1.5 },
  wide: { ax: PW / 2, ay: PH / 2, sx: 1290, sy: 540, k: 0.7, roll: -2 },
  push: { ax: CHIT_X + CHIT.w / 2, ay: 560, sx: 1290, sy: 500, k: 1.05 },
};
export const hookShot = (f: number): Shot => {
  const tPull = prog(f, L(CUE.pullFrom), L(CUE.pullTo) + 10, E.pull);
  const tPush = prog(f, L(CUE.pushPhone), L(CUE.lift1) + 6, E.cam);
  const s = lc(lc(SHOT.close, SHOT.wide, tPull), SHOT.push, tPush);
  const hold = breath(prog(f, 0, L(CUE.pullFrom), E.smooth) * (1 - tPull), 0.05); // the hook creeps in until the pull releases it
  const settle = breath(prog(f, L(CUE.pullTo), L(CUE.pushPhone), E.smooth) * (1 - tPush), 0.03);
  return { ...s, k: s.k * hold * settle };
};
/** Screen rect of the fryer chit at frame f (the Ask act lifts it from here). */
export const fryerChitScreen = (f: number) => {
  const s = hookShot(f);
  const p = toScreen(s, { x: CHIT_X, y: rowTop(f, 0) + 28 });
  return { x: p.x, y: p.y, w: CHIT.w * s.k, h: CHIT.h * s.k };
};

const PhoneScreen: React.FC<{ f: number; hideFryer?: boolean }> = ({ f, hideFryer }) => (
  <>
    {/* status bar and header */}
    <div style={{ position: 'absolute', left: 40, top: 30, fontFamily: FONT.mono, fontSize: 22, color: C.parchment, opacity: 0.85 }}>{PHONE.time}</div>
    <div style={{ position: 'absolute', left: 0, top: 96, width: SCREEN.w, textAlign: 'center' }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: C.parchment }}>Kitchen</div>
      <div style={{ marginTop: 6, fontFamily: FONT.mono, fontSize: 20, color: C.saffron, display: 'inline-flex', gap: 8, alignItems: 'baseline' }}>
        <Odometer frame={f} from={0} steps={ROWS.map((r, i) => ({ at: r.at, value: i + 1 }))} size={20} />
        <span>new</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, top: 196, width: SCREEN.w, height: 1, background: 'rgba(242,233,216,0.12)' }} />
    {ROWS.map((r, i) => {
      const a = slot(f, i);
      if (a <= 0) return null;
      const top = rowTop(f, i) - SCREEN.y;
      const landed = fd(f) >= r.at;
      const pop = spr(f, r.at - 3, SPX.bubble); // bubble scale in at 50 percent travel near the cue
      return (
        <div key={i} style={{ position: 'absolute', left: 24, top: 0, transform: `translate3d(0, ${top.toFixed(2)}px, 0)` }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.parchment, opacity: 0.6 * prog(f, slotStart(r), slotStart(r) + 8, E.smooth), height: 28 }}>{r.who}</div>
          {r.typingFrom !== undefined && !landed && <TypingDots frame={f} show={prog(f, r.typingFrom, r.typingFrom + 6, E.smooth)} />}
          {landed || r.typingFrom === undefined ? (
            r.kind === 'chit' ? (
              <div style={{ position: 'relative', width: CHIT.w, height: CHIT.h + 24, opacity: hideFryer && i === 0 ? 0 : 1, transformOrigin: '0 100%', transform: `scale(${mix(0.86, 1, pop).toFixed(4)})` }}>
                <Chit w={CHIT.w} h={CHIT.h} text={r.text} size={27} />
              </div>
            ) : (
              <div style={{ display: 'inline-block', maxWidth: 440, padding: '18px 24px', borderRadius: 28, borderBottomLeftRadius: 8, background: '#3A3229', color: C.parchment, fontFamily: FONT.text, fontSize: 27, lineHeight: 1.3,
                transformOrigin: '0 100%', transform: `scale(${mix(0.9, 1, pop).toFixed(4)})`, opacity: prog(f, r.at - 1, r.at + 5, E.smooth) }}>{r.text}</div>
            )
          ) : null}
        </div>
      );
    })}
  </>
);

/** The whole hook scene at act frame f. The Ask act draws it under its iris while the fryer chit lifts away. */
export const HookScene: React.FC<{ f: number; hideFryer?: boolean }> = ({ f, hideFryer }) => (
  <AbsoluteFill style={{ background: C.night }}>
    <World shot={hookShot(f)} w={PW} h={PH}>
      <PhoneFrame>
        <PhoneScreen f={f} hideFryer={hideFryer} />
      </PhoneFrame>
    </World>
  </AbsoluteFill>
);

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <HookScene f={f} />
      <Caption id="hookLine" frame={f} act={A} dark y={960} size={64} />
      <Caption id="pain1Line" frame={f} act={A} dark y={540} size={84} align="left" x={150} width={760} />
      <Disclosure text="Example venues. Invented names." frame={f} from={L(CUE.pullTo) - 20} to={ACT.hook.dur} dark />
    </AbsoluteFill>
  );
};
export const _unused = { lmix };
