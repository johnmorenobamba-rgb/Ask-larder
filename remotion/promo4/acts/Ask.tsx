// Act 2, bars 7 to 12: the fryer question lifts off the phone and drops into Ask Larder (landing 1 of 2),
// the real answer arrives, then "Where is the key to the safe?" goes to a supervisor. Ends on a whip down.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../brand';
import { E, prog, fd, clamp } from '../lib/anim';
import { breath, lc, dip, type Shot } from '../lib/camera';
import { ASK, Q } from '../data';
import { ACT, CUE, TYPE } from '../timeline';
import { APP, ASK_SLOTS, AskSheet, SHEET, pressEnv, type AskState } from '../ui';
import { Chit } from '../fx/Chit';
import { DropInto } from '../fx/DropInto';
import { Pointer, Ripple, useGesture } from '../fx/Cursor';
import { SubSamples } from '../fx/SubSamples';
import { Capture, Caption, Disclosure, Iris, World } from './common';
import { CHIT, HookScene, fryerChitScreen } from './Hook';

const A = ACT.ask.from;
const L = (abs: number) => abs - A;
const LIFT = 0;
const CONTACT = 26;
const TAP1 = L(CUE.tapAsk1);
const ANS1 = L(CUE.answer1);
const ANOTHER = L(CUE.tapAnother);
const TAP2 = L(CUE.tapAsk2);
const ANS2 = L(CUE.answer2);
const WHIP = [L(CUE.whipFrom), ACT.ask.dur] as const;
const typedSafe = TYPE.safe.map((t: number) => L(t));

const SHOT: Record<'wide' | 'q' | 'read' | 'safe', Shot> = {
  wide: { ax: APP.W / 2, ay: APP.H / 2, sx: 960, sy: 540, k: 1.42 },
  q: { ax: SHEET.x + SHEET.w / 2, ay: SHEET.y + 96, sx: 960, sy: 330, k: 2.55 },
  read: { ax: SHEET.x + SHEET.w / 2, ay: SHEET.y + 250, sx: 960, sy: 470, k: 2.45 },
  safe: { ax: SHEET.x + SHEET.w / 2, ay: SHEET.y + 150, sx: 960, sy: 450, k: 3.0 },
};
export const askShot = (f: number): Shot => {
  const t1 = prog(f, 4, 44, E.cam); // wide to the input as the chit lands
  const t2 = prog(f, ANS1, ANS1 + 70, E.cam); // down the answer while it arrives
  const t3 = prog(f, ANOTHER - 4, ANOTHER + 26, E.cam); // back to the input for the second question
  const t4 = prog(f, ANS2, ANS2 + 44, E.cam); // push in on the supervisor line
  let s = lc(lc(lc(lc(SHOT.wide, SHOT.q, t1), SHOT.read, t2), SHOT.q, t3), SHOT.safe, t4);
  const hold = breath(prog(f, ANS2 + 44, WHIP[0], E.smooth) * (1 - prog(f, WHIP[0], WHIP[1], E.smooth)), 0.025);
  const w = prog(f, WHIP[0], WHIP[1], E.exit); // accelerates out, cut on its fastest frame
  s = { ...s, ay: s.ay + 260 * w, k: s.k * hold * dip(w * 0.5, 0.1) };
  return s;
};
/** Screen px per frame of the whip at frame f (drives the sub frame blur). */
const whipSpeed = (f: number) => Math.abs(askShot(f).ay - askShot(f - 1).ay) * askShot(f).k;

const state = (f: number): AskState => {
  const F = fd(f);
  if (F < ANS1) {
    return { mode: 'input', typed: F >= CONTACT ? Q.fryer : '', caret: F >= CONTACT && F < TAP1, focus: prog(f, CONTACT - 4, CONTACT + 4, E.ui), pressAsk: pressEnv(f, TAP1), shell: 0 };
  }
  if (F < ANOTHER + 4) {
    return { mode: 'answer', typed: '', caret: false, focus: 0, asked: Q.fryer, answer: ASK.fryerAnswer, answerStart: ANS1 + 8, shell: prog(f, ANS1 - 1, ANS1 + 12, E.out), another: prog(f, ANS1 + 70, ANS1 + 80, E.smooth) };
  }
  if (F < ANS2) {
    const n = typedSafe.filter((t) => t <= F).length;
    return { mode: 'input', typed: ASK.safeQuestion.slice(0, n), caret: F < TAP2, focus: prog(f, ANOTHER + 4, ANOTHER + 10, E.ui), pressAsk: pressEnv(f, TAP2), shell: 0 };
  }
  return { mode: 'answer', typed: '', caret: false, focus: 0, asked: ASK.safeQuestion, answer: ASK.safeAnswer, answerStart: ANS2 + 6, escalation: true, shell: prog(f, ANS2 - 1, ANS2 + 12, E.out), another: 0 };
};

const AskWorld: React.FC<{ f: number }> = ({ f }) => (
  <World shot={askShot(f)} w={APP.W} h={APP.H + 200}>
    <Capture src="ask-larder-useful-3.png" w={APP.W} h={APP.H} />
    <AskSheet frame={f} s={state(f)} />
  </World>
);

export const Ask: React.FC = () => {
  const f = useCurrentFrame();
  const shot = askShot(f);
  const from = fryerChitScreen(ACT.hook.dur - 1); // where the chit sits on the hook's last frame
  const origin = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const g1 = useGesture(f, shot, { from: { x: 1700, y: 1000 }, target: { x: ASK_SLOTS.askBtn.x + 46, y: ASK_SLOTS.askBtn.y + 25 }, move: [TAP1 - 18, TAP1 - 3], click: TAP1, leaveAfter: 4 });
  const g2 = useGesture(f, shot, { from: { x: 1640, y: 980 }, target: { x: SHEET.x + 24 + 90, y: 703 }, move: [ANOTHER - 18, ANOTHER - 3], click: ANOTHER, leaveAfter: 4 });
  const g3 = useGesture(f, shot, { from: { x: 1500, y: 1020 }, target: { x: ASK_SLOTS.askBtn.x + 46, y: ASK_SLOTS.askBtn.y + 25 }, move: [TAP2 - 16, TAP2 - 3], click: TAP2 });
  const gs = [g1, g2, g3];
  const g = f < ANOTHER - 20 ? g1 : f < TAP2 - 18 ? g2 : g3;
  const n = whipSpeed(f) > 12 ? 4 : 1;
  return (
    <AbsoluteFill style={{ background: C.stage }}>
      {f < 24 && <HookScene f={ACT.hook.dur - 1} hideFryer />}
      <Iris frame={f} at={LIFT} x={origin.x} y={origin.y} r0={from.h * 0.6}>
        <SubSamples frame={f} n={n} lo={0} hi={ACT.ask.dur - 1e-3} render={(t) => <AskWorld f={t} />} />
      </Iris>
      <DropInto frame={f} lift={LIFT} contact={CONTACT} from={{ x: from.x, y: from.y, w: from.w }} slot={{ x: ASK_SLOTS.input.x - 6, y: ASK_SLOTS.input.y + ASK_SLOTS.input.h - (CHIT.h + 24) / SHOT.q.k, w: ASK_SLOTS.input.w }} shotB={askShot}>
        {(fill) => (
          <div style={{ position: 'relative', width: CHIT.w, height: CHIT.h + 24, opacity: 1 - prog(f, CONTACT - 1, CONTACT + 5, E.smooth) }}>
            <Chit w={CHIT.w} h={CHIT.h} text={Q.fryer} size={27} fill={fill} />
          </div>
        )}
      </DropInto>
      {gs.map((x, i) => (
        <Ripple key={i} frame={f} at={[TAP1, ANOTHER, TAP2][i]} shot={shot} p={i === 1 ? { x: SHEET.x + 24 + 90, y: 703 } : { x: ASK_SLOTS.askBtn.x + 46, y: ASK_SLOTS.askBtn.y + 25 }} r={i === 1 ? 30 : 40} color={C.red} />
      ))}
      <Pointer x={g.pos.x} y={g.pos.y} down={g.down} opacity={g.opacity} scale={1.7} />
      <Caption id="askLine1" frame={f} act={A} y={985} size={60} scrim />
      <Caption id="askLine2" frame={f} act={A} y={985} size={60} scrim />
      <Disclosure text="Example venue. Panel redrawn from the app." frame={f} from={30} to={WHIP[0]} />
    </AbsoluteFill>
  );
};
export const _u = { clamp };
