// Act 4, bars 15 to 21 (the payoff): three taps through a real checklist flow, an out of range reading
// that will not save without a note, and the flag on the owner's dashboard.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from '../brand';
import { E, prog, fd, mix, clamp } from '../lib/anim';
import { breath, lc, type Shot } from '../lib/camera';
import { FORMS } from '../data';
import { ACT, CUE, TYPE } from '../timeline';
import { APP, CHECK, ChecklistPage, TempPage, TEMP, TEMP_TARGETS, pressEnv } from '../ui';
import { Pointer, Ripple, useGesture } from '../fx/Cursor';
import { Odometer } from '../fx/Odometer';
import { morphRect } from '../fx/Morph';
import { Capture, Caption, Disclosure, Iris, World } from './common';
import { Pain2Scene, pain2ChitCentre } from './Pain2';

const A = ACT.forms.from;
const L = (abs: number) => abs - A;
const T_FORM = L(CUE.tapForm);
const T_MARK = L(CUE.tapMarkRest);
const T_SAVE = L(CUE.tapSave);
const SLIDE = L(CUE.slideTemp);
const T_FIELD = L(CUE.tapField);
const KEY = L(TYPE.reading[0]);
const T_NOTE = L(CUE.tapNote);
const T_SAVE2 = L(CUE.tapSaveReading);
const DASH = L(CUE.dashboard);

// the hub card the cursor opens (measured on forms-hub-by-cadence, css px)
const CARD = { x: 128, y: 573, w: 376, h: 118, r: 16 };
const MORPH = [T_FORM + 2, T_FORM + 22] as const;
const PASS_AT = FORMS.checks.map((_, i) => T_MARK + 2 + i * 4); // a cascade on 16ths
const CHECKED = (f: number) => (fd(f) < T_MARK + 2 ? 0 : Math.min(FORMS.checkCount, 1 + Math.floor((fd(f) - T_MARK - 2) / 2)));

const SHOT: Record<'hub' | 'card' | 'mark' | 'rows' | 'temp' | 'note' | 'flag' | 'tile' | 'dash', Shot> = {
  hub: { ax: APP.W / 2, ay: APP.H / 2, sx: 960, sy: 540, k: 1.42 },
  card: { ax: CARD.x + CARD.w / 2, ay: CARD.y + CARD.h / 2, sx: 960, sy: 560, k: 2.1 },
  mark: { ax: CHECK.markBtn.x + 40, ay: 440, sx: 1240, sy: 470, k: 1.9 }, // the page text keeps about 120 px from the left edge
  rows: { ax: APP.W / 2, ay: 470, sx: 960, sy: 500, k: 1.3 }, // the page title sits 70 px inside the frame
  temp: { ax: TEMP.card.x + TEMP.card.w / 2, ay: 300, sx: 960, sy: 470, k: 2.0 },
  note: { ax: TEMP.card.x + TEMP.card.w / 2, ay: 470, sx: 960, sy: 445, k: 1.65 }, // the reading label to the save button, all above the caption
  flag: { ax: TEMP.card.x + 200, ay: APP.H - 42, sx: 900, sy: 560, k: 2.4 },
  tile: { ax: 582, ay: 560, sx: 900, sy: 560, k: 3.0 },
  dash: { ax: APP.W / 2, ay: APP.H / 2, sx: 960, sy: 540, k: 1.42 },
};
// hub and checklist: one world (the checklist grows out of the hub card)
const checkShot = (f: number): Shot => {
  const t1 = prog(f, 6, T_FORM - 2, E.cam);
  const t2 = prog(f, MORPH[0], MORPH[1] + 6, E.cam);
  const t3 = prog(f, T_MARK + 8, T_MARK + 46, E.cam);
  const s = lc(lc(lc(SHOT.hub, SHOT.card, t1), SHOT.mark, t2), SHOT.rows, t3);
  return { ...s, k: s.k * breath(prog(f, T_MARK + 46, SLIDE, E.smooth), 0.03) };
};
const tempShot = (f: number): Shot => {
  const t1 = prog(f, KEY + 2, KEY + 40, E.cam);
  const t2 = prog(f, T_SAVE2 + 8, DASH, E.exit); // pushes into the flagged line, accelerating into the match cut
  return lc(lc(SHOT.temp, SHOT.note, t1), SHOT.flag, t2);
};
const dashShot = (f: number): Shot => {
  const t = prog(f, DASH, DASH + 60, E.pull);
  const s = lc(SHOT.tile, SHOT.dash, t);
  return { ...s, k: s.k * breath(prog(f, DASH + 60, ACT.forms.dur, E.smooth), 0.03) };
};

const Checklist: React.FC<{ f: number }> = ({ f }) => {
  const m = prog(f, MORPH[0], MORPH[1], E.inOut);
  const box = morphRect(CARD, { x: 0, y: 0, w: APP.W, h: APP.H + 400, r: 0 }, m);
  const ready = prog(f, PASS_AT[PASS_AT.length - 1], PASS_AT[PASS_AT.length - 1] + 8, E.ui);
  return (
    <>
      <Capture src="forms-hub-by-cadence.png" w={APP.W} h={APP.H} />
      {fd(f) >= MORPH[0] && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: APP.H + 400, clipPath: `inset(${box.y.toFixed(2)}px ${(APP.W - box.x - box.w).toFixed(2)}px ${(APP.H + 400 - box.y - box.h).toFixed(2)}px ${box.x.toFixed(2)}px round ${box.r.toFixed(2)}px)` }}>
          <ChecklistPage frame={f} build={prog(f, MORPH[0] + 8, MORPH[1] + 26, E.out)} passAt={PASS_AT} checked={CHECKED(f)} saveReady={ready} savePress={pressEnv(f, T_SAVE)} saved={prog(f, T_SAVE + 3, T_SAVE + 15, E.out)} />
        </div>
      )}
    </>
  );
};

const typedAt = (f: number) => (fd(f) >= KEY ? FORMS.unit.reading : '');
const Temp: React.FC<{ f: number }> = ({ f }) => (
  <TempPage frame={f} typed={typedAt(f)} caret={fd(f) >= T_FIELD && fd(f) < T_NOTE} focus={prog(f, T_FIELD - 1, T_FIELD + 4, E.ui)} out={prog(f, KEY, KEY + 6, E.ui)}
    note={FORMS.quickNotes[0]} noteOn={prog(f, T_NOTE + 1, T_NOTE + 6, E.ui)} chipPress={pressEnv(f, T_NOTE)} saveReady={prog(f, T_NOTE + 2, T_NOTE + 10, E.ui)}
    savePress={pressEnv(f, T_SAVE2)} saved={prog(f, T_SAVE2 + 3, T_SAVE2 + 12, E.out)} />
);

/** Partial slide cut: the checklist leaves left, the temperature log arrives from the right, same distance and time. */
// The two pages hand over in about 2 frames: no empty gap, and no long double exposure of two dense pages.
const slide = (f: number) => ({ out: prog(f, SLIDE - 12, SLIDE + 2, E.in), inn: prog(f, SLIDE - 8, SLIDE + 16, E.out) });

export const Forms: React.FC = () => {
  const f = useCurrentFrame();
  const sl = slide(f);
  const inDash = fd(f) >= DASH;
  const inTemp = fd(f) >= SLIDE - 8 && !inDash;
  const cs = checkShot(f), ts = tempShot(f), ds = dashShot(f);
  const shot = inDash ? ds : inTemp ? ts : cs;
  const g1 = useGesture(f, cs, { from: { x: 1500, y: 1000 }, target: { x: CARD.x + 190, y: CARD.y + 50 }, move: [T_FORM - 18, T_FORM - 3], click: T_FORM, leaveAfter: 2 });
  const g2 = useGesture(f, cs, { from: { x: 1600, y: 980 }, target: { x: CHECK.markBtn.x + 98, y: CHECK.markBtn.y + 22 }, move: [T_MARK - 16, T_MARK - 3], click: T_MARK, leaveAfter: 4 });
  const g3 = useGesture(f, cs, { from: { x: 1500, y: 700 }, target: { x: CHECK.save.x + 90, y: APP.H - 38 }, move: [T_SAVE - 16, T_SAVE - 3], click: T_SAVE });
  const g4 = useGesture(f, ts, { from: { x: 1650, y: 980 }, target: TEMP_TARGETS.field, move: [T_FIELD - 16, T_FIELD - 3], click: T_FIELD, leaveAfter: 4 });
  const g5 = useGesture(f, ts, { from: { x: 1500, y: 1000 }, target: TEMP_TARGETS.chip, move: [T_NOTE - 16, T_NOTE - 3], click: T_NOTE, leaveAfter: 4 });
  const g6 = useGesture(f, ts, { from: { x: 1300, y: 1000 }, target: TEMP_TARGETS.save, move: [T_SAVE2 - 14, T_SAVE2 - 3], click: T_SAVE2 });
  const gs = [g1, g2, g3, g4, g5, g6];
  const clicks = [T_FORM, T_MARK, T_SAVE, T_FIELD, T_NOTE, T_SAVE2];
  const idx = clicks.findIndex((c, i) => f < c + 12 && (i === 0 || f >= clicks[i - 1] + 6));
  const g = gs[idx < 0 ? 5 : idx];
  const taps = clicks.slice(0, 3).filter((c) => fd(f) >= c).length;
  return (
    <AbsoluteFill style={{ background: C.stage }}>
      {f < 22 && <Pain2Scene f={ACT.pain2.dur - 1} />}
      <Iris frame={f} at={0} x={pain2ChitCentre(ACT.pain2.dur - 1).x} y={pain2ChitCentre(ACT.pain2.dur - 1).y} r0={90}>
        <AbsoluteFill style={{ background: C.stage }}>
          {!inDash && (
            <AbsoluteFill style={{ transform: `translate3d(${(-230 * sl.out).toFixed(2)}px, 0, 0)`, opacity: 1 - prog(f, SLIDE - 7, SLIDE - 2, E.smooth) }}>
              {fd(f) < SLIDE + 2 && <World shot={cs} w={APP.W} h={APP.H + 400}><Checklist f={f} /></World>}
            </AbsoluteFill>
          )}
          {inTemp && (
            <AbsoluteFill style={{ transform: `translate3d(${(230 * (1 - sl.inn)).toFixed(2)}px, 0, 0)`, opacity: prog(f, SLIDE - 4, SLIDE + 2, E.smooth) }}>
              <World shot={ts} w={APP.W} h={APP.H}><Temp f={f} /></World>
            </AbsoluteFill>
          )}
          {inDash && <World shot={ds} w={APP.W} h={APP.H}><Capture src="owner-dashboard.png" w={APP.W} h={APP.H} /></World>}
        </AbsoluteFill>
      </Iris>
      {gs.map((x, i) => (
        <Ripple key={i} frame={f} at={clicks[i]} shot={i < 3 ? cs : ts} p={[{ x: CARD.x + 190, y: CARD.y + 50 }, { x: CHECK.markBtn.x + 98, y: CHECK.markBtn.y + 22 }, { x: CHECK.save.x + 90, y: APP.H - 38 }, TEMP_TARGETS.field, TEMP_TARGETS.chip, TEMP_TARGETS.save][i]} r={34} color={C.red} />
      ))}
      <Pointer x={g.pos.x} y={g.pos.y} down={g.down} opacity={g.opacity} scale={1.7} />
      {/* the measured claim, counted as it happens */}
      <div style={{ position: 'absolute', right: 96, top: 72, height: 56, borderRadius: 28, background: C.ink, color: C.parchment, padding: '0 26px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.mono, fontSize: 26,
        opacity: prog(f, T_FORM - 10, T_FORM - 2, E.smooth) * (1 - prog(f, SLIDE - 14, SLIDE - 4, E.smooth)) }}>
        <span style={{ opacity: 0.7 }}>TAPS</span>
        <Odometer frame={f} from={0} steps={clicks.slice(0, 3).map((c, i) => ({ at: c, value: i + 1 }))} size={26} />
      </div>
      <Caption id="formsLine" frame={f} act={A} y={935} size={60} scrim />
      <Caption id="formsSub" frame={f} act={A} y={1012} size={34} />
      <Caption id="noteLine" frame={f} act={A} y={985} size={60} scrim />
      <Caption id="dashLine" frame={f} act={A} y={985} size={60} scrim />
      <Disclosure text={inDash ? 'Example venue. Real screen.' : 'Example venue. Screens redrawn from the app.'} frame={f} from={30} to={ACT.forms.dur} />
      <span style={{ display: 'none' }}>{taps}{mix(0, 1, clamp(0))}</span>
    </AbsoluteFill>
  );
};
