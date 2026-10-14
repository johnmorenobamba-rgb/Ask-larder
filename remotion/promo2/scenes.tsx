import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO, easeOut, easeWipe } from "../v2/brand";
import { LarderMark } from "../v2/mark";
import { ASK, FADE_FRAMES, HOME, HOOK_LINES, HOOK_START, HOOK_TIMES, Q1, Q2, TRAIN, TURN2, WIPE_FRAMES, countAt } from "./timeline";
import { Caret, Cursor, Headline, INK_SOFT, MonoNote, PAGE_BG, RiseLine, SPR, SaffronRule, Stamp, StreamWords, Viewport, stampPressY, useCam, useSpring } from "./kit";

const clampI = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ---------------------------------------------------------------- scene shell with its own transition in
const Scene: React.FC<{ bg: string; enter: "wipe" | "fade" | "none"; children: React.ReactNode }> = ({ bg, enter, children }) => {
  const frame = useCurrentFrame();
  let style: React.CSSProperties = {};
  if (enter === "wipe") {
    const p = interpolate(frame, [0, WIPE_FRAMES], [0, 1], { easing: easeWipe, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    style = { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }; // hard straight edge sweeping left to right
  } else if (enter === "fade") {
    style = { opacity: easeOut(clampI(frame, 0, FADE_FRAMES)) };
  }
  return <AbsoluteFill style={{ background: bg, ...style }}>{children}</AbsoluteFill>;
};

const LEFT = { position: "absolute" as const, left: 160, top: 340, width: 700 };

// ---------------------------------------------------------------- 1 hook (Ink)
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = countAt(HOOK_TIMES, frame);
  const total = HOOK_LINES.join(" ").length;
  const full = HOOK_LINES.join(" ").slice(0, typed);
  const l1 = HOOK_LINES[0].length;
  const line1 = full.slice(0, l1);
  const line2 = full.slice(l1 + 1);
  const lastType = HOOK_TIMES[HOOK_TIMES.length - 1];
  const typing = typed < total;
  const since = frame - lastType;
  const onLine2 = typed > l1;
  const caret = <Caret height={84} color={C.saffron} typing={typing && typed > 0} sinceType={typed === 0 ? 99 : since} width={5} />;
  return (
    <Scene bg={C.ink} enter="none">
      <div style={{ position: "absolute", left: 160, top: 330 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: "104px", letterSpacing: "-0.02em", color: C.parchment, minHeight: 104 }}>
          {line1}
          {!onLine2 ? caret : null}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: "104px", letterSpacing: "-0.02em", color: C.parchment, minHeight: 104 }}>
          {line2}
          {onLine2 ? caret : null}
        </div>
        <div style={{ height: 36 }} />
        <SaffronRule delay={lastType + 8} />
        <div style={{ height: 32 }} />
        <RiseLine delay={lastType + 16} style={{ fontFamily: FONT_BODY, fontSize: 44, lineHeight: "56px", color: "rgba(242,233,216,0.78)" }}>The manager is not picking up.</RiseLine>
      </div>
    </Scene>
  );
};

// ---------------------------------------------------------------- 2 staff home: pull back to reveal, then tap
const HW = 1000;
const HH = 839;
export const SceneHome: React.FC = () => {
  const cam = useCam(
    [
      { at: 0, s: 1.7, fx: 0.22, fy: 0.1 },
      { at: 20, s: 1, fx: 0.5, fy: 0.5 },
      { at: HOME.exit, s: 1.55, fx: 0.625, fy: 0.516 },
    ],
    HW,
    HH,
  );
  return (
    <Scene bg={PAGE_BG} enter="wipe">
      <div style={LEFT}>
        <Headline lines={["Staff open", "one screen."]} sub="On the iPad your venue already has." delay={20} />
      </div>
      <Viewport x={824} y={120} w={HW} h={HH} cam={cam} entryDelay={8}
        overlay={<Cursor pts={[{ at: HOME.cursorFrom, x: 1.02, y: 1.0 }, { at: HOME.cursorTo, x: 0.6, y: 0.5 }]} clicks={[{ at: HOME.click }]} cam={cam} w={HW} h={HH} fadeOutAt={HOME.click + 14} />}>
        <Img src={staticFile("shots/home.webp")} style={{ width: HW, height: HH, display: "block" }} />
      </Viewport>
      <MonoNote text="Example venue. Invented names." delay={40} />
    </Scene>
  );
};

// ---------------------------------------------------------------- 3 Ask Larder: typed question, streamed answer, fallback
const CW = 1000;
const CH = 800;

const Turn: React.FC<{ f: number; qText: string; qTimes: number[]; submit: number; words: string[]; wTimes: number[]; size?: number; boxW?: number }> = ({ f, qText, qTimes, submit, words, wTimes, size = 34, boxW }) => {
  const typed = countAt(qTimes, f);
  const typing = typed < qText.length && typed > 0;
  const lastType = qTimes[qTimes.length - 1];
  const sent = f >= submit;
  const press = f >= submit && f < submit + 5 ? 0.96 : 1;
  const answerIn = easeOut(clampI(f, submit + 4, submit + 16));
  const doneAt = wTimes[wTimes.length - 1] + 10;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* the input, until it is sent */}
      <div style={{ position: "absolute", left: 56, right: 56, top: 150, opacity: sent ? 0 : 1 }}>
        <div style={{ height: 92, borderRadius: 46, border: "2px solid rgba(122,92,67,0.55)", background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 0 36px", fontFamily: FONT_BODY, fontSize: 34, color: C.ink }}>
          <span>
            {typed === 0 ? <span style={{ color: "rgba(122,92,67,0.7)" }}>Ask something.</span> : qText.slice(0, typed)}
            {f >= 10 ? <Caret height={38} color={C.ink} typing={typing} sinceType={typed === 0 ? 20 : f - (qTimes[typed - 1] ?? 0)} width={3} /> : null}
          </span>
          <span style={{ transform: `scale(${press})`, background: C.ink, color: C.parchment, borderRadius: 32, padding: "14px 30px", fontFamily: FONT_MONO, fontWeight: 500, fontSize: 24, letterSpacing: "0.08em" }}>ASK</span>
        </div>
      </div>
      {/* the question as asked, then the answer */}
      <div style={{ position: "absolute", left: 56, right: 56, top: 130, opacity: sent ? easeOut(clampI(f, submit, submit + 10)) : 0 }}>
        <div style={{ fontFamily: FONT_BODY, fontStyle: "italic", fontSize: 32, color: C.clay }}>{qText}</div>
        <div style={{ marginTop: 28, width: boxW, border: `3px solid ${C.green}`, borderRadius: 32, padding: "40px 44px", fontFamily: FONT_BODY, fontSize: size, lineHeight: `${Math.round(size * 1.47)}px`, color: C.ink, opacity: answerIn }}>
          <StreamWords words={words} times={wTimes} frame={f} />
        </div>
        <div style={{ marginTop: 30, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", color: C.clay, textDecoration: "underline", opacity: clampI(f, doneAt, doneAt + 12) }}>ASK ANOTHER QUESTION</div>
      </div>
    </div>
  );
};

export const SceneAsk: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam(
    [
      { at: 0, s: 1, fx: 0.5, fy: 0.5 },
      { at: ASK.push, s: 1.3, fx: 0.36, fy: 0.3 },
    ],
    CW,
    CH,
  );
  const t1 = 1 - clampI(frame, TURN2 - 14, TURN2 - 2);
  const t2 = clampI(frame, TURN2 - 6, TURN2 + 6);
  const cap1 = clampI(frame, 118, 132) * (1 - clampI(frame, TURN2 - 20, TURN2 - 8));
  const cap2 = clampI(frame, ASK.a2Times[0] + 30, ASK.a2Times[0] + 44);
  return (
    <Scene bg={PAGE_BG} enter="fade">
      <div style={LEFT}>
        <Headline lines={["Ask Larder."]} delay={8} />
        <div style={{ position: "relative", height: 130, marginTop: 28 }}>
          <div style={{ position: "absolute", fontFamily: FONT_BODY, fontSize: 36, lineHeight: "48px", color: INK_SOFT, opacity: cap1, maxWidth: 620 }}>Answers from your approved procedures.</div>
          <div style={{ position: "absolute", fontFamily: FONT_BODY, fontSize: 36, lineHeight: "48px", color: INK_SOFT, opacity: cap2, maxWidth: 620 }}>Keys, codes and logins go to a supervisor.</div>
        </div>
      </div>
      <Viewport x={824} y={140} w={CW} h={CH} cam={cam} entryDelay={6}>
        <div style={{ position: "absolute", inset: 0, background: C.parchment }}>
          <div style={{ position: "absolute", left: 56, top: 48, right: 56, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 48, color: C.ink, letterSpacing: "-0.01em" }}>Ask Larder</span>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", color: C.clay }}>CLOSE</span>
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: t1 }}>
            <Turn f={frame} qText={Q1} qTimes={ASK.q1Times} submit={ASK.submit1} words={ASK.a1Words} wTimes={ASK.a1Times} />
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: t2 }}>
            <Turn f={frame - 0} qText={Q2} qTimes={ASK.q2Times} submit={ASK.submit2} words={ASK.a2Words} wTimes={ASK.a2Times} size={40} boxW={640} />
          </div>
        </div>
      </Viewport>
      <MonoNote text="Example venue. Example procedure." delay={40} />
    </Scene>
  );
};

// ---------------------------------------------------------------- 4 training: tap, then the Stamp
const TW = 1000;
const TH = 616;
export const SceneTrain: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam([{ at: 0, s: 1, fx: 0.5, fy: 0.5 }], TW, TH);
  const sel = easeOut(clampI(frame, TRAIN.click, TRAIN.click + 10));
  const swap = easeOut(clampI(frame, TRAIN.swap, TRAIN.swap + 12));
  const sf = frame - TRAIN.stamp;
  const press = stampPressY(sf);
  return (
    <Scene bg={PAGE_BG} enter="fade">
      <div style={LEFT}>
        <Headline lines={["Built from", "your SOPs."]} sub="You approve every module first." delay={8} />
      </div>
      <Viewport x={824} y={232} w={TW} h={TH} cam={cam} entryDelay={6} pressY={press}
        overlay={<Cursor pts={[{ at: TRAIN.cursorFrom, x: 0.92, y: 1.05 }, { at: TRAIN.cursorTo, x: 0.3, y: 0.735 }]} clicks={[{ at: TRAIN.click, color: C.red }]} cam={cam} w={TW} h={TH} fadeOutAt={TRAIN.click + 12} />}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - swap }}>
          <Img src={staticFile("shots/check.webp")} style={{ width: TW, height: TH, display: "block" }} />
          <div style={{ position: "absolute", left: TW * 0.054, top: TH * 0.665, width: TW * 0.892, height: TH * 0.141, borderRadius: 40, border: `4px solid ${C.green}`, background: C.parchment, opacity: sel, display: "flex", alignItems: "center", paddingLeft: 31, fontFamily: FONT_BODY, fontSize: 27, color: C.ink }}>Twenty seconds</div>
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: swap, background: C.parchment }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center" }}>
            {sf >= 0 ? <Stamp frame={sf} word="COMPLETE" size={220} /> : <div style={{ width: 220, height: 220 }} />}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 410, textAlign: "center", fontFamily: FONT_MONO, fontWeight: 500, fontSize: 28, color: C.ink, opacity: clampI(frame, TRAIN.stamp + 6, TRAIN.stamp + 18) }}>Food safety basics completed</div>
        </div>
      </Viewport>
      <MonoNote text="Example venue. Example module." delay={40} />
    </Scene>
  );
};

// ---------------------------------------------------------------- 5 owner dashboard: pull back to reveal
const DW = 1000;
const DH = 852;
export const SceneOwner: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = useCam(
    [
      { at: 0, s: 1.75, fx: 0.375, fy: 0.47 },
      { at: 22, s: 1, fx: 0.5, fy: 0.5 },
    ],
    DW,
    DH,
  );
  const hl = easeOut(clampI(frame, 70, 84));
  return (
    <Scene bg={PAGE_BG} enter="fade">
      <div style={LEFT}>
        <Headline lines={["You see what", "staff ask."]} sub="Every question sent to a supervisor shows here." delay={16} />
      </div>
      <Viewport x={824} y={114} w={DW} h={DH} cam={cam} entryDelay={4}>
        <Img src={staticFile("shots/dashboard.webp")} style={{ width: DW, height: DH, display: "block" }} />
        <div style={{ position: "absolute", left: DW * 0.268, top: DH * 0.411, width: DW * 0.217, height: DH * 0.116, borderRadius: 14, border: `3px solid ${C.saffron}`, opacity: hl }} />
      </Viewport>
      <MonoNote text="Example venue. Invented names." delay={40} />
    </Scene>
  );
};

// ---------------------------------------------------------------- 6 close (Ink)
export const SceneClose: React.FC = () => {
  const m = useSpring(14, SPR.surface);
  return (
    <Scene bg={C.ink} enter="wipe">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36, opacity: m, transform: `translateY(${(1 - m) * 24}px) scale(${0.96 + 0.04 * m})` }}>
          <LarderMark size={150} color={C.parchment} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 150, letterSpacing: "-0.025em", color: C.parchment, lineHeight: 1 }}>Larder</span>
        </div>
        <div style={{ height: 44 }} />
        <SaffronRule delay={34} />
        <div style={{ height: 40 }} />
        <RiseLine delay={42} style={{ fontFamily: FONT_BODY, fontSize: 44, lineHeight: "56px", color: "rgba(242,233,216,0.85)", textAlign: "center" }}>Answers from your venue. Not from a guess.</RiseLine>
        <div style={{ height: 36 }} />
        <RiseLine delay={52} style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 24, letterSpacing: "0.08em", color: "rgba(242,233,216,0.62)" }}>asklarder.com.au</RiseLine>
      </AbsoluteFill>
    </Scene>
  );
};
