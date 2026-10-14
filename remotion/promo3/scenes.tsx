import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO, easeInOut, easeOut } from "../v2/brand";
import { ClipView } from "../v2/fx";
import { LarderMark } from "../v2/mark";
import { Caret, Cursor, Headline, INK_SOFT, MonoNote, PAGE_BG, RiseLine, SPR, Stamp, Viewport, stampPressY, toScreen, useCam, useSpring, type Cam } from "../promo2/kit";
import { CERT, CERT_DATE, CERT_DUE, FORMS, OWNER, SIGN_NAME, STATION, TRAIN } from "./timeline";
import { countAt } from "../promo2/timeline";

const clamp01 = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LEFT = { position: "absolute" as const, left: 160, top: 340, width: 700 };

const Scene: React.FC<{ bg?: string; enter: "wipe" | "fade" | "none"; children: React.ReactNode }> = ({ bg = PAGE_BG, enter, children }) => {
  const frame = useCurrentFrame();
  let style: React.CSSProperties = {};
  if (enter === "wipe") style = { clipPath: `inset(0 ${(1 - interpolate(frame, [0, 18], [0, 1], { easing: easeInOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" })) * 100}% 0 0)` };
  else if (enter === "fade") style = { opacity: easeOut(clamp01(frame, 6, 14)) };
  return <AbsoluteFill style={{ background: bg, ...style }}>{children}</AbsoluteFill>;
};

/** Click ripple that stays pinned to a point on the content while the camera moves. */
const RippleAt: React.FC<{ at: number; nx: number; ny: number; cam: Cam; w: number; h: number; color?: string }> = ({ at, nx, ny, cam, w, h, color = C.saffron }) => {
  const d = useCurrentFrame() - at;
  if (d < 0 || d > 14) return null;
  const t = easeOut(d / 14);
  const p = toScreen(cam, w, h, nx, ny);
  const r = lerp(8, 44, t);
  return <div style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `3px solid ${color}`, opacity: 0.9 * (1 - t) }} />;
};

// ================================================================ 3 station: scan the sticker, land on the hub
const SW = 1000;
const SH = 800;
const STICKER = { x: 640, y: 505, w: 210, h: 268 };
const QR = { x: STICKER.x + 30, y: STICKER.y + 72, s: 150 };

const Sticker: React.FC = () => (
  <div style={{ position: "absolute", left: STICKER.x, top: STICKER.y, width: STICKER.w, height: STICKER.h, background: "#FFFFFF", borderRadius: 14, transform: "rotate(-1.5deg)", boxShadow: "0 2px 3px rgba(31,27,22,0.35), 0 10px 18px rgba(31,27,22,0.28)", textAlign: "center", padding: "20px 0 0" }}>
    <div style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 12, letterSpacing: "0.12em", color: C.red }}>LARDER</div>
    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.ink, marginTop: 4 }}>Pizza oven</div>
    <Img src={staticFile("img/qr.png")} style={{ position: "absolute", left: 30, top: 72, width: QR.s, height: QR.s }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", color: C.clay }}>SCAN FOR TRAINING</div>
  </div>
);

const Brackets: React.FC<{ cam: Cam; frame: number }> = ({ cam, frame }) => {
  const qr = toScreen(cam, SW, SH, QR.x / SW, QR.y / SH);
  const size = QR.s * cam.s;
  const pad = 22;
  const target = { x: qr.x - pad, y: qr.y - pad, w: size + pad * 2, h: size + pad * 2 };
  const search = { x: 170, y: 140, w: 660, h: 520 };
  const p = easeInOut(clamp01(frame, STATION.bracketsIn, STATION.lock - 6));
  const r = { x: lerp(search.x, target.x, p), y: lerp(search.y, target.y, p), w: lerp(search.w, target.w, p), h: lerp(search.h, target.h, p) };
  const locked = frame >= STATION.lock;
  const color = locked && frame < STATION.lock + 14 ? C.saffron : C.parchment;
  const op = clamp01(frame, STATION.bracketsIn, STATION.bracketsIn + 8);
  const L = 46;
  const corner = (x: number, y: number, dx: number, dy: number) => `M${x + dx * L} ${y} L${x} ${y} L${x} ${y + dy * L}`;
  const ring = clamp01(frame, STATION.lock, STATION.lock + 16);
  return (
    <svg width={SW} height={SH} style={{ position: "absolute", inset: 0, opacity: op, overflow: "visible" }}>
      <g fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 3px rgba(31,27,22,0.5))" }}>
        <path d={corner(r.x, r.y, 1, 1)} />
        <path d={corner(r.x + r.w, r.y, -1, 1)} />
        <path d={corner(r.x, r.y + r.h, 1, -1)} />
        <path d={corner(r.x + r.w, r.y + r.h, -1, -1)} />
      </g>
      {locked && ring < 1 ? <rect x={r.x - ring * 28} y={r.y - ring * 28} width={r.w + ring * 56} height={r.h + ring * 56} rx={18} fill="none" stroke={C.saffron} strokeWidth={3} opacity={0.8 * (1 - ring)} /> : null}
    </svg>
  );
};

const HubCard: React.FC<{ title: string; text: string; delay: number; pressAt?: number }> = ({ title, text, delay, pressAt }) => {
  const p = useSpring(delay, SPR.surface);
  const f = useCurrentFrame();
  const pressed = pressAt !== undefined && f >= pressAt;
  const dip = pressAt !== undefined ? interpolate(f - pressAt, [0, 3, 10], [1, 0.975, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 22}px) scale(${dip})`, border: `3px solid ${pressed ? C.ink : "rgba(122,92,67,0.4)"}`, borderRadius: 28, padding: "20px 40px" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 34, color: C.ink }}>{title}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 22, color: "rgba(31,27,22,0.7)", marginTop: 4 }}>{text}</div>
    </div>
  );
};

const HubContent: React.FC = () => {
  const d = STATION.hubIn;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.parchment }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 48 }}>
        <RiseLine delay={d + 2} style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 20, letterSpacing: "0.1em", textTransform: "uppercase", color: C.clay }}>Pizza oven</RiseLine>
        <RiseLine delay={d + 6} style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, marginBottom: 24 }}>What do you need?</RiseLine>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <HubCard title="Training" text="Work through your training for this station." delay={d + 12} pressAt={STATION.tapClick} />
          <HubCard title="FAQs" text="2 quick answers for this station." delay={d + 18} />
          <HubCard title="Troubleshooting" text="1 known issue and how to fix them." delay={d + 24} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 44, bottom: 40, width: 84, height: 84, borderRadius: "50%", background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(31,27,22,0.28)", opacity: clamp01(useCurrentFrame(), d + 30, d + 42) }}>
        <LarderMark size={44} color={C.parchment} />
      </div>
      <div style={{ position: "absolute", right: 50, bottom: 62, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 19, letterSpacing: "0.06em", color: C.clay, textDecoration: "underline", opacity: clamp01(useCurrentFrame(), d + 34, d + 46) }}>Something felt unsafe?</div>
    </div>
  );
};

export const SceneStation: React.FC<{ enter?: "fade" | "wipe" }> = ({ enter = "fade" }) => {
  const frame = useCurrentFrame();
  const focus = easeOut(clamp01(frame, STATION.focusFrom, STATION.focusTo));
  const camA = useCam([{ at: 0, s: 1, fx: 0.5, fy: 0.5 }, { at: STATION.push, s: 2.5, fx: (QR.x + QR.s / 2) / SW, fy: (QR.y + QR.s / 2) / SH }], SW, SH);
  const camB = useCam([{ at: 0, s: 1, fx: 0.5, fy: 0.5 }], SW, SH);
  const photoOut = 1 - clamp01(frame, STATION.hubIn, STATION.hubIn + 14);
  const subA = easeOut(clamp01(frame, 40, 54)) * (1 - clamp01(frame, STATION.subSwap - 10, STATION.subSwap));
  const subB = easeOut(clamp01(frame, STATION.subSwap, STATION.subSwap + 14));
  const sub: React.CSSProperties = { position: "absolute", fontFamily: FONT_BODY, fontSize: 36, lineHeight: "48px", color: INK_SOFT, maxWidth: 620 };
  return (
    <Scene enter={enter}>
      <div style={LEFT}>
        <Headline lines={["Scan the", "sticker."]} delay={10} />
        <div style={{ position: "relative", height: 110, marginTop: 28 }}>
          <div style={{ ...sub, opacity: subA }}>Printed from the owner screen. Stuck where it is needed.</div>
          <div style={{ ...sub, opacity: subB }}>Opens that station's training, answers and fixes.</div>
        </div>
      </div>
      <div style={{ opacity: photoOut }}>
        <Viewport x={824} y={140} w={SW} h={SH} cam={camA} entryDelay={6} overlay={<Brackets cam={camA} frame={frame} />}>
          <div style={{ position: "absolute", inset: 0, filter: `blur(${(1 - focus) * 7}px)`, background: C.ink }}>
            <Img src={staticFile("img/pizza-oven.jpg")} style={{ position: "absolute", left: 0, top: -453, width: SW, height: 1333 }} />
            <Sticker />
          </div>
        </Viewport>
      </div>
      {frame >= STATION.hubIn - 2 ? (
        <Viewport x={824} y={140} w={SW} h={SH} cam={camB} entryDelay={STATION.hubIn}
          overlay={<Cursor pts={[{ at: STATION.tapFrom, x: 0.96, y: 0.92 }, { at: STATION.tapTo, x: 0.5, y: 0.3 }]} clicks={[{ at: STATION.tapClick }]} cam={camB} w={SW} h={SH} fadeOutAt={STATION.tapClick + 40} />}>
          <HubContent />
        </Viewport>
      ) : null}
      <MonoNote text="Example venue. Stock photo. Sticker added." delay={40} />
    </Scene>
  );
};

// ================================================================ 5 forms: the real recording, three taps
const FW = 1000;
const FH = 750;
export const SceneForms: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = useCam(
    [
      { at: 0, s: 1, fx: 0.5, fy: 0.5 },
      { at: FORMS.pushIn, s: 1.35, fx: 0.76, fy: 0.4 },
      { at: FORMS.pullBack, s: 1, fx: 0.5, fy: 0.5 },
      { at: FORMS.saveIn, s: 1.3, fx: 0.76, fy: 0.85 },
    ],
    FW,
    FH,
  );
  const count = countAt(FORMS.taps, frame);
  const lastTap = count > 0 ? FORMS.taps[count - 1] : -99;
  const bump = spring({ frame: frame - lastTap, fps, config: SPR.stamp });
  return (
    <Scene enter="fade">
      <div style={LEFT}>
        <Headline lines={["Three taps."]} sub="A checklist where everything passes. Nothing typed." delay={10} />
        <div style={{ marginTop: 70, display: "flex", alignItems: "baseline", gap: 26 }}>
          <span style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 22, letterSpacing: "0.1em", color: C.clay }}>TAPS</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 120, lineHeight: "120px", color: C.ink, display: "inline-block", transform: `scale(${count > 0 ? 0.88 + 0.12 * bump : 1})`, transformOrigin: "0 100%" }}>{count}</span>
        </div>
      </div>
      <Viewport x={824} y={165} w={FW} h={FH} cam={cam} entryDelay={6}
        overlay={<>{FORMS.taps.map((t, i) => <RippleAt key={t} at={t} nx={FORMS.tapPos[i].x} ny={FORMS.tapPos[i].y} cam={cam} w={FW} h={FH} />)}</>}>
        <ClipView src="clips/three-taps-s1.mp4" w={FW} h={FH} zoom={1} cx={0.5} cy={0.5} srcW={1024} srcH={768} startFrom={FORMS.clipStart} />
      </Viewport>
      <MonoNote text="Example venue. Recorded in the app." delay={40} />
    </Scene>
  );
};

// ================================================================ 6 certificate: photo, issued date, due date worked out
const KW = 1000;
const KH = 800;
const CertRow: React.FC<{ top: number; children: React.ReactNode; focused?: boolean }> = ({ top, children, focused }) => (
  <div style={{ position: "absolute", left: 175, width: 650, top, height: 66, borderRadius: 24, border: `3px solid ${focused ? C.red : "rgba(122,92,67,0.4)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontSize: 24, color: C.ink }}>{children}</div>
);
const MonoLabel: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: "absolute", left: 175, top, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 17, color: C.clay }}>{children}</div>
);

const CertContent: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = countAt(CERT.dateTimes, frame);
  const dateDone = typed >= CERT_DATE.length;
  const dueO = easeOut(clamp01(frame, CERT.dueIn, CERT.dueIn + 12));
  const ready = easeOut(clamp01(frame, CERT.dueIn, CERT.dueIn + 12));
  const verifying = frame >= CERT.saveClick && frame < CERT.done;
  const doneO = easeOut(clamp01(frame, CERT.done, CERT.done + 10));
  const sf = frame - CERT.stamp;
  const focusedDate = frame >= CERT.dateClick && frame < CERT.saveClick;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.parchment }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - doneO }}>
        <div style={{ position: "absolute", left: 175, top: 54, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 46, color: C.ink }}>RSA certificate</div>
        <MonoLabel top={134}>Photo of certificate</MonoLabel>
        <CertRow top={162}>
          <span style={{ fontFamily: FONT_BODY }}>{frame >= CERT.fileShown ? "IMG_2043.jpg" : "Choose a photo"}</span>
          <span style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 17, color: C.clay }}>Browse</span>
        </CertRow>
        <MonoLabel top={262}>Issued date</MonoLabel>
        <CertRow top={290} focused={focusedDate}>
          <span style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 24 }}>
            {typed === 0 ? <span style={{ color: "rgba(122,92,67,0.55)" }}>dd/mm/yyyy</span> : CERT_DATE.slice(0, typed)}
            {focusedDate && !dateDone ? <Caret height={28} color={C.ink} typing sinceType={0} width={2} /> : null}
          </span>
        </CertRow>
        <MonoLabel top={392}>Refresher recommended by</MonoLabel>
        <div style={{ position: "absolute", left: 175, top: 420, width: 650, fontFamily: FONT_BODY, fontSize: 24, color: C.ink }}>
          <span style={{ opacity: 1 - dueO, position: "absolute" }}>Enter the issued date to see this</span>
          <span style={{ opacity: dueO }}>{CERT_DUE}</span>
        </div>
        <div style={{ position: "absolute", left: 175, top: 520, width: 650, height: 66, borderRadius: 33, background: C.red, color: C.parchment, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 + 0.5 * ready }}>
          {verifying ? "Verifying…" : "Save certificate"}
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: doneO }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center" }}>
          {sf >= 0 ? <Stamp frame={sf} word="UPLOADED" size={210} /> : <div style={{ width: 210, height: 210 }} />}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: FONT_MONO, fontWeight: 500, fontSize: 26, color: C.ink, opacity: clamp01(frame, CERT.stamp + 6, CERT.stamp + 18) }}>RSA certificate uploaded</div>
        <div style={{ position: "absolute", left: 320, width: 360, top: 480, height: 62, borderRadius: 31, background: C.red, color: C.parchment, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", opacity: clamp01(frame, CERT.stamp + 14, CERT.stamp + 26) }}>Back to certificates</div>
      </div>
    </div>
  );
};

export const SceneCert: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam(
    [
      { at: 0, s: 1, fx: 0.5, fy: 0.5 },
      { at: CERT.push, s: 1.25, fx: 0.5, fy: 0.5 },
      { at: CERT.pull, s: 1, fx: 0.5, fy: 0.5 },
    ],
    KW,
    KH,
  );
  const pts = [
    { at: CERT.fileFrom, x: 0.97, y: 0.97 },
    { at: CERT.fileTo, x: 0.5, y: 0.241 },
    { at: CERT.dateFrom, x: 0.5, y: 0.241 },
    { at: CERT.dateTo, x: 0.5, y: 0.404 },
    { at: CERT.saveFrom, x: 0.5, y: 0.404 },
    { at: CERT.saveTo, x: 0.5, y: 0.69 },
  ];
  return (
    <Scene enter="fade">
      <div style={LEFT}>
        <Headline lines={["Add a", "certificate."]} sub="Add the photo and the issued date. Larder works out the due date." delay={10} />
      </div>
      <Viewport x={824} y={140} w={KW} h={KH} cam={cam} entryDelay={6} pressY={stampPressY(frame - CERT.stamp)}
        overlay={<Cursor pts={pts} clicks={[{ at: CERT.fileClick }, { at: CERT.dateClick }, { at: CERT.saveClick, color: C.red }]} cam={cam} w={KW} h={KH} fadeOutAt={CERT.saveClick + 14} />}>
        <CertContent />
      </Viewport>
      <MonoNote text="Example venue. Screen redrawn from the app." delay={40} />
    </Scene>
  );
};

// ================================================================ 7 training: tap an answer, sign by typing a name, the Stamp
const TW = 1000;
const TH = 800;
const QUIZ_H = 616;
const QUIZ_TOP = 92;

const SignContent: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = countAt(TRAIN.nameTimes, frame);
  const typing = typed > 0 && typed < SIGN_NAME.length;
  const focused = frame >= TRAIN.nameStart - 4 && frame < TRAIN.confirmClick;
  const doneO = easeOut(clamp01(frame, TRAIN.done, TRAIN.done + 10));
  const sf = frame - TRAIN.stamp;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.parchment }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - doneO }}>
        <div style={{ position: "absolute", left: 175, top: 130, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 54, color: C.ink }}>Sign to confirm</div>
        <div style={{ position: "absolute", left: 175, top: 212, width: 650, fontFamily: FONT_BODY, fontSize: 26, lineHeight: "36px", color: C.ink }}>Type your full name to confirm you've completed onboarding.</div>
        <div style={{ position: "absolute", left: 175, top: 320, width: 650, height: 100, borderRadius: 28, border: `3px solid ${focused ? C.red : "rgba(122,92,67,0.4)"}`, display: "flex", alignItems: "center", padding: "0 30px", fontFamily: FONT_DISPLAY, fontSize: 46, color: C.ink }}>
          {typed === 0 ? <span style={{ color: "rgba(122,92,67,0.5)", fontFamily: FONT_BODY, fontSize: 30 }}>Full name</span> : SIGN_NAME.slice(0, typed)}
          {focused ? <Caret height={48} color={C.ink} typing={typing} sinceType={typing ? 0 : frame - (TRAIN.nameTimes[SIGN_NAME.length - 1] ?? 0)} width={3} /> : null}
        </div>
        <div style={{ position: "absolute", left: 175, top: 444, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 17, color: C.clay }}>Signed 12 Oct 2026 at 3:27:41 pm on tablet/desktop.</div>
        <div style={{ position: "absolute", left: 175, top: 510, width: 650, height: 72, borderRadius: 36, background: C.red, color: C.parchment, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", opacity: typed >= SIGN_NAME.length ? 1 : 0.5 }}>Confirm and sign</div>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: doneO }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, textAlign: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 58, color: C.ink }}>You're set up.</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", justifyContent: "center" }}>
          {sf >= 0 ? <Stamp frame={sf} word="SIGNED" size={230} /> : <div style={{ width: 230, height: 230 }} />}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", fontFamily: FONT_MONO, fontWeight: 500, fontSize: 26, color: C.ink, opacity: clamp01(frame, TRAIN.stamp + 6, TRAIN.stamp + 18) }}>Onboarding complete</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 524, textAlign: "center", fontFamily: FONT_MONO, fontWeight: 500, fontSize: 20, color: C.clay, opacity: clamp01(frame, TRAIN.stamp + 12, TRAIN.stamp + 24) }}>{SIGN_NAME} · Saltbush Corner Kitchen · 12 Oct 2026</div>
      </div>
    </div>
  );
};

export const SceneTrain: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam([{ at: 0, s: 1, fx: 0.5, fy: 0.5 }, { at: TRAIN.confirmFrom - 6, s: 1.18, fx: 0.5, fy: 0.62 }, { at: TRAIN.done - 6, s: 1, fx: 0.5, fy: 0.5 }], TW, TH);
  const sel = easeOut(clamp01(frame, TRAIN.quizClick, TRAIN.quizClick + 10));
  const signO = easeOut(clamp01(frame, TRAIN.signIn, TRAIN.signIn + 12));
  const pts = [
    { at: TRAIN.cursorFrom, x: 0.93, y: 0.97 },
    { at: TRAIN.cursorTo, x: 0.3, y: (QUIZ_TOP + 0.735 * QUIZ_H) / TH },
    { at: TRAIN.confirmFrom, x: 0.3, y: (QUIZ_TOP + 0.735 * QUIZ_H) / TH },
    { at: TRAIN.confirmTo, x: 0.5, y: 0.7 },
  ];
  return (
    <Scene enter="fade">
      <div style={LEFT}>
        <Headline lines={["Built from", "your SOPs."]} sub="You approve every module first. Staff sign off by typing their name." delay={10} />
      </div>
      <Viewport x={824} y={140} w={TW} h={TH} cam={cam} entryDelay={6} pressY={stampPressY(frame - TRAIN.stamp)}
        overlay={<Cursor pts={pts} clicks={[{ at: TRAIN.quizClick }, { at: TRAIN.confirmClick, color: C.red }]} cam={cam} w={TW} h={TH} fadeOutAt={TRAIN.confirmClick + 12} />}>
        <div style={{ position: "absolute", inset: 0, background: C.parchment, opacity: 1 - signO }}>
          <Img src={staticFile("shots/check.webp")} style={{ position: "absolute", left: 0, top: QUIZ_TOP, width: TW, height: QUIZ_H }} />
          <div style={{ position: "absolute", left: TW * 0.054, top: QUIZ_TOP + QUIZ_H * 0.665, width: TW * 0.892, height: QUIZ_H * 0.141, borderRadius: 40, border: `4px solid ${C.green}`, background: C.parchment, opacity: sel, display: "flex", alignItems: "center", paddingLeft: 31, fontFamily: FONT_BODY, fontSize: 27, color: C.ink }}>Twenty seconds</div>
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: signO }}>
          <SignContent />
        </div>
      </Viewport>
      <MonoNote text="Example venue. Sign off screens redrawn from the app." delay={40} />
    </Scene>
  );
};

// ================================================================ 8 owner: what staff ask, then what is expiring
const DW = 1000;
const DH = 852;
export const SceneOwner: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam(
    [
      { at: 0, s: 1.75, fx: 0.375, fy: 0.47 },
      { at: OWNER.camEnd, s: 1, fx: 0.5, fy: 0.5 },
      { at: OWNER.swap - 8, s: 1, fx: 0.5, fy: 0.5 },
    ],
    DW,
    DH,
  );
  const hl = easeOut(clamp01(frame, OWNER.highlight, OWNER.highlight + 14)) * (1 - clamp01(frame, OWNER.swap - 10, OWNER.swap));
  const dashO = 1 - clamp01(frame, OWNER.swap - 12, OWNER.swap - 3);
  const certsO = easeOut(clamp01(frame, OWNER.swap - 3, OWNER.swap + 8));
  const aO = 1 - clamp01(frame, OWNER.swap - 10, OWNER.swap);
  const bO = clamp01(frame, OWNER.swap, OWNER.swap + 12);
  return (
    <Scene enter="fade">
      <div style={LEFT}>
        <div style={{ opacity: aO, position: "absolute", left: 0, top: 0 }}>
          <Headline lines={["You see what", "staff ask."]} sub="Every question sent to a supervisor shows here." delay={16} />
        </div>
        {frame >= OWNER.swap - 2 ? (
          <div style={{ opacity: bO, position: "absolute", left: 0, top: 0 }}>
            <div style={{ position: "relative" }}>
              <SwapHeadline delay={OWNER.swap + 2} />
            </div>
          </div>
        ) : null}
      </div>
      <Viewport x={824} y={114} w={DW} h={DH} cam={cam} entryDelay={4}>
        <div style={{ position: "absolute", inset: 0, opacity: dashO }}>
          <Img src={staticFile("shots/dashboard.webp")} style={{ width: DW, height: DH, display: "block" }} />
          <div style={{ position: "absolute", left: DW * 0.268, top: DH * 0.411, width: DW * 0.217, height: DH * 0.116, borderRadius: 14, border: `3px solid ${C.saffron}`, opacity: hl }} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: certsO, background: C.parchment, overflow: "hidden" }}>
          <Img src={staticFile("shots/owner-expiry.webp")} style={{ position: "absolute", left: 0, top: -125, width: DW, height: 1603 }} />
        </div>
      </Viewport>
      <MonoNote text="Example venue. Invented names and dates." delay={40} />
    </Scene>
  );
};

const SwapHeadline: React.FC<{ delay: number }> = ({ delay }) => (
  <Headline lines={["You see what", "is expiring."]} sub="Every certificate and its date." delay={delay} />
);

