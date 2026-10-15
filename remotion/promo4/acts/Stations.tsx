// Act 5, bars 22 to 27: a new hire in the cellar, the beer pouring flat. Scan the station's code, open its
// page, and read the venue's own fix. The question chit docks into the station page's Ask Larder button.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C } from '../brand';
import { E, prog, fd, mix, lmix, clamp } from '../lib/anim';
import { breath, lc, toScreen, type Shot } from '../lib/camera';
import { Q } from '../data';
import { ACT, CUE } from '../timeline';
import { APP, StationHub, TroublePage, Sticker, hubCard, TS, TS_CARD_Y, pressEnv } from '../ui';
import { Chit } from '../fx/Chit';
import { Viewfinder, handheld } from '../fx/Viewfinder';
import { morphRect } from '../fx/Morph';
import { Pointer, Ripple, useGesture } from '../fx/Cursor';
import { Capture, Caption, Disclosure, World } from './common';

const A = ACT.stations.from;
const L = (abs: number) => abs - A;
const LIFT = L(CUE.lift3);
const LOCK = LIFT;
const T_TROUBLE = L(CUE.tapTrouble);
const MORPH = [T_TROUBLE + 2, T_TROUBLE + 22] as const;
const DISC = L(CUE.disc);
const END = ACT.stations.dur;

// ---- the cellar shot: the demo venue's station photo in a large frame, a QR label on the wall
const PHOTO = { x: 300, y: 120, w: 1320, h: 740 };
const STICK = { x: 860, y: 150, w: 210 }; // photo local px
const QR_IN_STICK = { x: STICK.w * 0.16, y: STICK.w * 0.36, s: STICK.w * 0.68 }; // the code's box inside the sticker
const cellarShot = (f: number): Shot => {
  const c = { ax: PHOTO.w / 2, ay: PHOTO.h / 2, sx: 960, sy: 490, k: 1 };
  const z = { ax: STICK.x + STICK.w / 2, ay: STICK.y + STICK.w * 0.7, sx: 960, sy: 520, k: 2.3 };
  const t = prog(f, L(CUE.brackets) - 8, LOCK - 2, E.cam);
  const out = prog(f, LOCK + 2, LOCK + 10, E.in); // zoom through the code
  const s = lc(c, z, t);
  const wob = handheld(f, 6 * (1 - prog(f, LOCK - 10, LOCK, E.smooth)) * t);
  return { ...s, sx: s.sx + wob.x, sy: s.sy + wob.y, k: s.k * breath(prog(f, 0, L(CUE.brackets), E.smooth), 0.04) * lmix(1, 2.2, out) };
};
export const qrScreen = (f: number) => {
  const s = cellarShot(f);
  const p = toScreen(s, { x: STICK.x + QR_IN_STICK.x, y: STICK.y + QR_IN_STICK.y });
  return { x: p.x, y: p.y, w: QR_IN_STICK.s * s.k, h: QR_IN_STICK.s * s.k };
};

// ---- station hub and troubleshooting world
const hubShot = (f: number): Shot => {
  const base = { ax: APP.W / 2, ay: APP.H / 2, sx: 960, sy: 540, k: 1.4 }; // the whole page, so the Ask button the chit docks into is in frame
  const card = hubCard(2);
  const onCard = { ax: card.x + card.w / 2, ay: card.y + 40, sx: 960, sy: 480, k: 2.1 };
  const tIn = prog(f, LIFT + 6, LIFT + 34, E.out); // the incoming zoom keeps moving as it lands
  const tCard = prog(f, T_TROUBLE - 26, T_TROUBLE + 2, E.cam);
  const s = lc(base, onCard, tCard);
  return { ...s, k: s.k * lmix(0.72, 1, tIn) };
};
export const hubOnCard = () => { const card = hubCard(2); return { ax: card.x + card.w / 2, ay: card.y + 40, sx: 960, sy: 480, k: 2.1 }; };
const tsShot = (f: number): Shot => {
  const top = { ax: TS.left + TS.width / 2, ay: 210, sx: 960, sy: 470, k: 2.0 };
  const card = { ax: TS.left + TS.width / 2, ay: TS_CARD_Y(2) + 110, sx: 960, sy: 470, k: 2.05 };
  const esc = { ax: TS.left + TS.width / 2, ay: TS_CARD_Y(2) + 240, sx: 960, sy: 470, k: 2.5 };
  const t0 = prog(f, MORPH[0], MORPH[1] + 4, E.cam); // continues from the hub shot on the card: no jump at the morph
  const t1 = prog(f, MORPH[1] + 4, MORPH[1] + 52, E.cam);
  const t2 = prog(f, L(CUE.escalation) - 6, L(CUE.escalation) + 34, E.cam);
  const s = lc(lc(lc(hubOnCard(), top, t0), card, t1), esc, t2);
  const sink = prog(f, DISC, END, E.smooth); // the scene sinks a little under the rising horizon
  return { ...s, sy: s.sy + 40 * sink, k: s.k * breath(prog(f, L(CUE.escalation) + 34, DISC, E.smooth), 0.03) };
};

// ---- the device: the cellar question chit, big at first, then docking into the hub's Ask button
const CHIT_BIG = { w: 900, h: 140, x: 160, y: 180 };
const ASK_BTN = { x: 24 + 32, y: APP.H - 24 - 32 }; // centre of the hub's Ask Larder button (world)
const deviceAt = (f: number) => {
  const p1 = prog(f, L(CUE.brackets) - 10, L(CUE.brackets) + 22, E.glide); // moves aside for the scan
  const corner = { x: 120, y: 90, w: 430 };
  const big = { x: CHIT_BIG.x, y: CHIT_BIG.y, w: CHIT_BIG.w };
  const a = { x: mix(big.x, corner.x, p1), y: mix(big.y, corner.y, p1), w: lmix(big.w, corner.w, p1) };
  const p2 = prog(f, LIFT + 6, LIFT + 34, E.inOut); // docks into the Ask button as the hub lands
  const btn = toScreen(hubShot(f), ASK_BTN);
  const dockW = 46 * hubShot(f).k;
  return { x: mix(a.x, btn.x - dockW / 2, p2), y: mix(a.y, btn.y - dockW * 0.45, p2), w: lmix(a.w, dockW, p2), fade: prog(f, LIFT + 26, LIFT + 34, E.smooth) };
};

export const Stations: React.FC = () => {
  const f = useCurrentFrame();
  const inHub = fd(f) >= LIFT;
  const hs = hubShot(f), ts = tsShot(f);
  const m = prog(f, MORPH[0], MORPH[1], E.inOut);
  const card = hubCard(2);
  const box = morphRect({ ...card, r: 16 }, { x: 0, y: 0, w: APP.W, h: 2000, r: 0 }, m);
  const g = useGesture(f, hs, { from: { x: 1550, y: 1000 }, target: { x: card.x + card.w / 2 + 80, y: card.y + card.h / 2 }, move: [T_TROUBLE - 18, T_TROUBLE - 3], click: T_TROUBLE });
  const d = deviceAt(f);
  const s = d.w / CHIT_BIG.w;
  const sharp = 1 - prog(f, 0, 8, E.smooth);
  const dashBlur = 1 - prog(f, 6, 22, E.smooth);
  const photoFocus = prog(f, L(CUE.brackets) - 12, L(CUE.brackets) + 6, E.smooth); // rack focus onto the wall
  return (
    <AbsoluteFill style={{ background: C.night }}>
      {/* the seam from the dashboard: a sharp copy hands to a constant blur copy, then the Ink stage */}
      {f < 24 && (
        <>
          <AbsoluteFill style={{ opacity: dashBlur, filter: 'blur(14px) brightness(0.55)' }}><World shot={{ ax: 512, ay: 384, sx: 960, sy: 540, k: 1.46 }} w={APP.W} h={APP.H}><Capture src="owner-dashboard.png" w={APP.W} h={APP.H} /></World></AbsoluteFill>
          <AbsoluteFill style={{ opacity: sharp }}><World shot={{ ax: 512, ay: 384, sx: 960, sy: 540, k: 1.46 }} w={APP.W} h={APP.H}><Capture src="owner-dashboard.png" w={APP.W} h={APP.H} /></World></AbsoluteFill>
        </>
      )}
      {!inHub || f < LIFT + 10 ? (
        <AbsoluteFill style={{ opacity: prog(f, 4, 18, E.smooth) * (1 - prog(f, LIFT + 2, LIFT + 10, E.smooth)) }}>
          <World shot={cellarShot(f)} w={PHOTO.w} h={PHOTO.h}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: PHOTO.w, height: PHOTO.h, borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}>
              {/* rack focus: a sharp copy under a constant 10 px copy that fades out (never an animated blur radius) */}
              <Img src={staticFile('img/cellar.jpg')} style={{ position: 'absolute', left: 0, top: -(PHOTO.w * 4 / 3 - PHOTO.h) * 0.42, width: PHOTO.w, height: PHOTO.w * 4 / 3 }} />
              {photoFocus < 1 && <Img src={staticFile('img/cellar.jpg')} style={{ position: 'absolute', left: -40, top: -(PHOTO.w * 4 / 3 - PHOTO.h) * 0.42 - 40, width: PHOTO.w + 80, height: PHOTO.w * 4 / 3 + 80, filter: 'blur(10px)', opacity: 1 - photoFocus }} />}
              <div style={{ position: 'absolute', left: 0, top: 0, width: PHOTO.w, height: PHOTO.h, background: `rgba(31,27,22,${(0.45 * (1 - photoFocus) + 0.12).toFixed(3)})` }} />
              <div style={{ position: 'absolute', left: STICK.x, top: STICK.y, transform: 'rotate(-2deg)', transformOrigin: '0 0' }}><Sticker w={STICK.w} /></div>
            </div>
          </World>
          {f >= L(CUE.brackets) - 2 && f < LIFT + 8 && <Viewfinder frame={f} lockAt={LOCK} target={qrScreen(f)} />}
        </AbsoluteFill>
      ) : null}
      {inHub && (
        <AbsoluteFill style={{ opacity: prog(f, LIFT, LIFT + 6, E.smooth), background: C.stage }}>
          <World shot={fd(f) >= MORPH[0] ? ts : hs} w={APP.W} h={2000}>
            {fd(f) < MORPH[1] + 2 && <StationHub frame={f} build={prog(f, LIFT + 4, LIFT + 36, E.out)} pressT={pressEnv(f, T_TROUBLE)} hoverT={prog(f, T_TROUBLE - 4, T_TROUBLE - 1, E.ui)} />}
            {fd(f) >= MORPH[0] && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: APP.W, height: 2000, clipPath: `inset(${box.y.toFixed(2)}px ${(APP.W - box.x - box.w).toFixed(2)}px ${(2000 - box.y - box.h).toFixed(2)}px ${box.x.toFixed(2)}px round ${box.r.toFixed(2)}px)` }}>
                <TroublePage frame={f} build={prog(f, MORPH[0] + 8, MORPH[1] + 24, E.out)} />
              </div>
            )}
          </World>
        </AbsoluteFill>
      )}
      {/* the device */}
      {d.fade < 1 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate3d(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`, opacity: (1 - d.fade) * prog(f, L(CUE.bubble4) - 6, L(CUE.bubble4) + 2, E.smooth), width: CHIT_BIG.w, height: CHIT_BIG.h + 40 }}>
          <Chit w={CHIT_BIG.w} h={CHIT_BIG.h} text={Q.cellar} size={56} />
        </div>
      )}
      {inHub && <Ripple frame={f} at={T_TROUBLE} shot={hs} p={{ x: card.x + card.w / 2 + 80, y: card.y + card.h / 2 }} r={40} color={C.red} />}
      {inHub && <Pointer x={g.pos.x} y={g.pos.y} down={g.down} opacity={g.opacity} scale={1.7} />}
      {/* the horizon rise: an Ink disc with a thin Saffron rim covers the frame on the urgency downbeat */}
      {f >= DISC - 1 && <Horizon f={f} />}
      <Caption id="pain3Line" frame={f} act={A} dark y={975} size={64} />
      <Caption id="scanLine" frame={f} act={A} dark y={975} size={64} />
      <Caption id="fixLine" frame={f} act={A} y={985} size={60} scrim />
      <Disclosure text={inHub ? 'Example venue. Screens redrawn from the app.' : 'Example venue. Stock photo. Label added.'} frame={f} from={10} to={DISC} dark={!inHub} />
      <span style={{ display: 'none' }}>{clamp(0)}</span>
    </AbsoluteFill>
  );
};

const Horizon: React.FC<{ f: number }> = ({ f }) => {
  const R = 2600;
  const t = prog(f, DISC - 1, END + 2, E.dolly);
  const top = mix(1080 + 30, -260, t);
  const sc = mix(1, 1.5, t);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * R, height: 2 * R, borderRadius: '50%', background: C.night, boxShadow: `0 0 0 2px ${C.saffron}`, transformOrigin: '50% 0',
      transform: `translate3d(${960 - R}px, ${top.toFixed(2)}px, 0) scale(${sc.toFixed(4)})` }} />
  );
};
