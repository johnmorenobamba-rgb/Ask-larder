import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO, H, SAFE_X, SAFE_Y, W, easeInOut, easeOut } from "./brand";
import { A } from "./assets";
import { Broll, BubbleReveal, Cam, ClipView, Fade, FadeBlock, Grain, Halftone, Plane, Vignette, Words } from "./fx";
import { LarderMark } from "./mark";

// Every scene is one idea. All copy is on screen (the film is silent). Headlines 64px or more, body 36px or more.
// Claims: only built and tested features. Tap counts are the measured ones in the claims ledger (T1: 3 taps, 0 keystrokes).

type SceneProps = { dur: number; wipeFrom?: string; id: string };

const Shell: React.FC<{ bg: string; children: React.ReactNode } & SceneProps> = ({ bg, children, dur, wipeFrom, id }) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [dur - 6, dur], [1, 0.0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: bg }}>
      {children}
      <Vignette />
      <Grain />
      {wipeFrom ? <BubbleReveal id={id} color={wipeFrom} /> : null}
      <AbsoluteFill style={{ background: "transparent", opacity: 1 - out }} />
    </AbsoluteFill>
  );
};

const Note: React.FC<{ text: string; color?: string; from?: number }> = ({ text, color = C.parchment, from = 12 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 12], [0, 0.85], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return <div style={{ position: "absolute", left: SAFE_X, bottom: SAFE_Y + 8, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 36, color, opacity: o }}>{text}</div>;
};

// ---------------------------------------------------------------- 1 pain: so many forms
const FORM_CARDS: [string, string][] = [
  ["Kitchen opening checklist", "EVERY SHIFT"],
  ["Temperature log", "DAILY"],
  ["Kitchen cleaning and sanitising", "DAILY"],
  ["Beer line cleaning", "WEEKLY"],
  ["Probe thermometer check", "MONTHLY"],
  ["Reheating log", "WHEN IT HAPPENS"],
  ["First aid kit check", "MONTHLY"],
];

export const SceneForms: React.FC<SceneProps & { short?: boolean }> = ({ dur, short, ...p }) => {
  const frame = useCurrentFrame();
  const layers = [
    { d: 0.62, speed: 0.4, blur: 7, op: 0.5, y: [130, 560, 880] },
    { d: 0.85, speed: 0.8, blur: 0, op: 0.95, y: [70, 340, 630, 880] },
    { d: 1.1, speed: 1.2, blur: 0, op: 1, y: [210, 740] },
  ];
  return (
    <Shell bg={C.ink} dur={dur} {...p}>
      <Broll src={A.broll.dishPan} grade="duo-saffron" dur={dur} opacity={0.62} startFrom={0} />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${C.ink} 0%, rgba(31,27,22,0.78) 38%, rgba(31,27,22,0.05) 100%)` }} />
      <Halftone color={C.saffron} opacity={0.22} origin="100% 0%" />
      {layers.map((L, li) =>
        L.y.map((y, yi) => {
          const idx = (li * 3 + yi) % FORM_CARDS.length;
          const [name, chip] = FORM_CARDS[idx];
          const w = 600 * L.d, h = 168 * L.d;
          const x0 = 1020 + ((yi * 131 + li * 89) % 110);
          const x = x0 - frame * L.speed;
          return (
            <div key={`${li}-${yi}`} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 24 * L.d, background: C.parchment, opacity: L.op, filter: L.blur ? `blur(${L.blur}px)` : undefined, boxShadow: `0 ${30 * L.d}px ${60 * L.d}px rgba(0,0,0,0.5)`, padding: `${22 * L.d}px ${28 * L.d}px`, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 38 * L.d, color: C.ink, lineHeight: 1.1 }}>{name}</div>
              <div style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 28 * L.d, color: C.red }}>{chip}</div>
            </div>
          );
        }),
      )}
      <div style={{ position: "absolute", left: SAFE_X, top: 150, width: 980 }}>
        {short ? (
          <Words text="So many forms." size={150} color={C.parchment} start={4} stagger={7} />
        ) : (
          <>
            <Fade from={0} to={92} outF={10}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 980 }}>
                <Words text="Every shift." size={124} color={C.parchment} start={4} />
                <div style={{ height: 6 }} />
                <Words text="Every day." size={124} color={C.parchment} start={20} />
                <div style={{ height: 6 }} />
                <Words text="Every week." size={124} color={C.parchment} start={36} />
                <div style={{ height: 6 }} />
                <Words text="Every month." size={124} color={C.saffron} start={52} />
              </div>
            </Fade>
            <Fade from={96} to={dur} inF={6} outF={4}>
              <div style={{ position: "absolute", left: 0, top: 70, width: 880 }}>
                <Words text="And all of it needs filing." size={124} color={C.saffron} start={100} stagger={6} />
              </div>
            </Fade>
          </>
        )}
      </div>
    </Shell>
  );
};

// ---------------------------------------------------------------- 2 pain: "I'll answer your question tomorrow"
export const SceneBubble: React.FC<SceneProps> = ({ dur, ...p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 10, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  const drift = interpolate(frame, [0, dur], [0, -26], { easing: easeInOut });
  return (
    <Shell bg={C.red} dur={dur} {...p}>
      <Broll src={A.broll.dishUtensils} grade="duo-red" dur={dur} opacity={0.85} objectPosition="30% 50%" scaleFrom={1.05} scaleTo={1.15} startFrom={0} />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(178,58,44,0.05) 0%, rgba(178,58,44,0.6) 55%, rgba(178,58,44,0.92) 100%)` }} />
      <Halftone color={C.ink} opacity={0.2} origin="0% 100%" />
      <div style={{ position: "absolute", right: SAFE_X + 20, top: 150 + drift, width: 1060, transform: `scale(${0.55 + pop * 0.45}) rotate(${(1 - pop) * -4}deg)`, transformOrigin: "80% 100%" }}>
        <div style={{ background: C.parchment, border: `8px solid ${C.ink}`, borderRadius: 64, padding: "56px 64px 64px", boxShadow: "0 50px 100px rgba(0,0,0,0.45)" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, lineHeight: 1.06, color: C.ink, letterSpacing: "-0.015em" }}>
            “I’ll answer your question <span style={{ color: C.red }}>tomorrow</span> when the manager’s back”
          </div>
        </div>
        <div style={{ position: "absolute", left: 140, bottom: -44, width: 90, height: 90, background: C.parchment, borderRight: `8px solid ${C.ink}`, borderBottom: `8px solid ${C.ink}`, transform: "rotate(45deg) skew(10deg,10deg)" }} />
      </div>
      <Fade from={60} to={dur} inF={12} outF={0}>
        <div style={{ position: "absolute", right: SAFE_X + 60, bottom: SAFE_Y + 30, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 84, color: C.parchment }}>Sound familiar?</div>
      </Fade>
    </Shell>
  );
};

// ---------------------------------------------------------------- 3 you want to tap
export const SceneWantTap: React.FC<SceneProps> = ({ dur, ...p }) => (
  <Shell bg={C.parchment} dur={dur} {...p}>
    <Halftone color={C.clay} opacity={0.22} origin="100% 100%" />
    <div style={{ position: "absolute", left: 1010, top: 130, width: 760, height: 760, borderRadius: "50%", background: C.saffron }} />
    <div style={{ position: "absolute", left: SAFE_X, top: 700, width: 300, height: 18, borderRadius: 9, background: C.red }} />
    <Cam dur={dur} from={{ s: 1.0, x: 30 }} to={{ s: 1.05, x: -20 }}>
      <Plane x={960} y={70} w={880} h={860} rotY={-8} rotX={2} z={40}>
        <Img src={staticFile(A.img.hub)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
      </Plane>
    </Cam>
    <div style={{ position: "absolute", left: SAFE_X, top: 250, width: 780 }}>
      <Words text="You want to open something and tap." size={112} color={C.ink} start={4} stagger={6} />
    </div>
    <Note text="Example venue, invented names." color={C.clay} />
  </Shell>
);

// ---------------------------------------------------------------- 4 tap, tap, tap (measured: 3 taps, nothing typed)
const TapChip: React.FC<{ n: number; at: number }> = ({ n, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 180, mass: 0.6 } });
  const on = frame >= at;
  return (
    <div style={{ width: 150, height: 150, borderRadius: "50%", background: on ? C.saffron : "transparent", border: `6px solid ${on ? C.saffron : "rgba(242,233,216,0.4)"}`, color: on ? C.ink : "rgba(242,233,216,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 84, transform: `scale(${on ? 0.8 + p * 0.2 : 1})`, boxShadow: on ? `0 0 0 ${interpolate(frame - at, [0, 18], [0, 36], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}px rgba(232,169,59,${interpolate(frame - at, [0, 18], [0.5, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })})` : undefined }}>
      {n}
    </div>
  );
};

export const SceneTaps: React.FC<SceneProps & { clipStart: number; tapFrames: number[]; compact?: boolean; rate?: number }> = ({ dur, clipStart, tapFrames, compact, rate = 1, ...p }) => {
  const c = A.clips.threeTaps;
  return (
    <Shell bg={C.ink} dur={dur} {...p}>
      <Halftone color={C.saffron} opacity={0.14} origin="0% 0%" />
      <Cam dur={dur} from={{ s: 1.0 }} to={{ s: 1.04, x: -16 }}>
        <Plane x={W - SAFE_X - 1000} y={(H - 750) / 2} w={1000} h={750} rotY={compact ? -4 : -6} z={30}>
          <ClipView src={c.src} w={1000} h={750} zoom={1.0} cx={0.5} cy={0.5} srcW={c.w} srcH={c.h} startFrom={clipStart} rate={rate} />
        </Plane>
      </Cam>
      <div style={{ position: "absolute", left: SAFE_X, top: 140 }}>
        <Words text="Three taps." size={124} color={C.saffron} start={4} />
        <div style={{ height: 18 }} />
        <FadeBlock from={20}>
          <Words text="Nothing typed." size={92} color={C.parchment} start={24} stagger={8} />
        </FadeBlock>
      </div>
      <div style={{ position: "absolute", left: SAFE_X, bottom: SAFE_Y + 70, display: "flex", gap: 34 }}>
        {tapFrames.map((f, i) => (
          <TapChip key={i} n={i + 1} at={f} />
        ))}
      </div>
      <Note text="A checklist where everything passes. Example venue." />
    </Shell>
  );
};

// ---------------------------------------------------------------- 5 a failed reading asks what you did
export const SceneFailed: React.FC<SceneProps> = ({ dur, ...p }) => {
  const c = A.clips.failed;
  return (
    <Shell bg={C.red} dur={dur} {...p}>
      <Halftone color={C.ink} opacity={0.22} origin="100% 100%" />
      <Cam dur={dur} from={{ s: 1.0, x: 0 }} to={{ s: 1.05, x: 14 }}>
        <Plane x={SAFE_X + 120} y={(H - 800) / 2} w={760} h={800} rotY={5} z={30}>
          <ClipView src={c.src} w={760} h={800} zoom={1.81} cx={0.74} cy={0.4725} srcW={c.w} srcH={c.h} startFrom={c.startFrom} />
        </Plane>
      </Cam>
      <div style={{ position: "absolute", left: 1090, top: 170, width: 740 }}>
        <Words text="Temperatures are typed." size={96} color={C.parchment} start={6} stagger={7} />
        <Fade from={64} to={dur} inF={10} outF={0}>
          <div style={{ position: "absolute", left: 0, top: 330, width: 740 }}>
            <Words text="A failed reading asks what you did about it." size={72} color={C.parchment} start={68} stagger={5} />
          </div>
        </Fade>
        <Fade from={128} to={dur} inF={10} outF={0}>
          <div style={{ position: "absolute", left: 0, top: 640, background: C.ink, borderRadius: 40, padding: "22px 34px", fontFamily: FONT_MONO, fontWeight: 500, fontSize: 40, color: C.saffron, lineHeight: 1.25 }}>One tap on a ready made note does it.</div>
        </Fade>
      </div>
    </Shell>
  );
};

// ---------------------------------------------------------------- 6 one screen for the owner
export const SceneOwner: React.FC<SceneProps> = ({ dur, ...p }) => {
  const c = A.clips.dashboard;
  return (
    <Shell bg={C.parchment} dur={dur} {...p}>
      <Halftone color={C.clay} opacity={0.2} origin="0% 100%" />
      <Cam dur={dur} from={{ s: 1.0, y: 20 }} to={{ s: 1.06, y: -10 }}>
        <Plane x={(W - 1500) / 2} y={280} w={1500} h={620} rotX={2} z={40}>
          <ClipView src={A.clips.stations.src} w={1500} h={620} zoom={1.6} cx={0.5} cy={0.3} srcW={A.clips.stations.w} srcH={A.clips.stations.h} startFrom={150} />
          <Fade from={170} to={dur} inF={12} outF={0}>
            <ClipView src={c.src} w={1500} h={620} zoom={1.5} cx={0.5} cy={0.3} srcW={c.w} srcH={c.h} startFrom={205} />
          </Fade>
        </Plane>
      </Cam>
      <div style={{ position: "absolute", left: SAFE_X, top: SAFE_Y + 20 }}>
        <Words text="One screen for the owner." size={104} color={C.ink} start={4} stagger={6} />
      </div>
      <Fade from={50} to={dur} inF={10} outF={0}>
        <div style={{ position: "absolute", left: SAFE_X, top: SAFE_Y + 140, display: "flex", gap: 20 }}>
          {["Records you can print or download", "Failed readings flagged"].map((t) => (
            <div key={t} style={{ background: C.ink, color: C.parchment, borderRadius: 999, padding: "14px 30px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 36 }}>{t}</div>
          ))}
        </div>
      </Fade>
      <Note text="Example venue, invented names." color={C.clay} />
    </Shell>
  );
};

// ---------------------------------------------------------------- 7 Ask Larder, with the supervisor fallback
export const SceneAsk: React.FC<SceneProps & { clipStart: number }> = ({ dur, clipStart, ...p }) => {
  const c = A.clips.ask;
  return (
    <Shell bg={C.ink} dur={dur} {...p}>
      <Halftone color={C.saffron} opacity={0.14} origin="100% 0%" />
      <Cam dur={dur} from={{ s: 1.0 }} to={{ s: 1.05, x: 12 }}>
        <Plane x={W - SAFE_X - 960} y={(H - 820) / 2} w={960} h={820} rotY={-5} z={30}>
          <ClipView src={c.src} w={960} h={820} zoom={1.7} cx={0.5} cy={0.72} srcW={c.w} srcH={c.h} startFrom={clipStart} />
        </Plane>
      </Cam>
      <div style={{ position: "absolute", left: SAFE_X, top: 150, width: 740 }}>
        <Words text="Ask Larder answers from your approved content only." size={80} color={C.parchment} start={4} stagger={5} />
        <Fade from={100} to={dur} inF={10} outF={0}>
          <div style={{ position: "absolute", left: 0, top: 400, width: 740 }}>
            <Words text="Keys, codes and logins go to a supervisor." size={68} color={C.saffron} start={104} stagger={5} />
          </div>
        </Fade>
      </div>
      <Note text="Example venue." />
    </Shell>
  );
};

// ---------------------------------------------------------------- 8 stations
export const SceneStations: React.FC<SceneProps & { clipStart: number }> = ({ dur, clipStart, ...p }) => {
  const c = A.clips.stations;
  return (
    <Shell bg={C.green} dur={dur} {...p}>
      <Halftone color={C.ink} opacity={0.2} origin="0% 0%" />
      <Cam dur={dur} from={{ s: 1.0, x: 20 }} to={{ s: 1.05, x: -20 }}>
        <Plane x={SAFE_X} y={370} w={1130} h={560} rotY={4} z={30}>
          <ClipView src={c.src} w={1130} h={560} zoom={1.35} cx={0.5} cy={0.78} srcW={c.w} srcH={c.h} startFrom={clipStart} />
        </Plane>
      </Cam>
      <div style={{ position: "absolute", left: SAFE_X, top: SAFE_Y + 40, width: 1100 }}>
        <Words text="Scan the code on the machine." size={92} color={C.parchment} start={4} stagger={6} />
      </div>
      <Fade from={20} to={dur} inF={10} outF={0}>
        <div style={{ position: "absolute", right: SAFE_X + 20, top: 330, width: 440, background: C.parchment, borderRadius: 36, padding: 28, boxShadow: "0 50px 100px rgba(0,0,0,0.4)" }}>
          <Img src={staticFile(A.img.qr)} style={{ width: "100%", display: "block" }} />
          <div style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 36, color: C.ink, textAlign: "center", marginTop: 12 }}>SCAN FOR TRAINING</div>
        </div>
      </Fade>
      <Note text="Example venue. Stock images." />
    </Shell>
  );
};

// ---------------------------------------------------------------- 9 call to action
export const SceneCta: React.FC<SceneProps> = ({ dur, ...p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 14, fps, config: { damping: 12, stiffness: 130 } });
  return (
    <Shell bg={C.red} dur={dur} {...p}>
      <Halftone color={C.ink} opacity={0.22} origin="0% 100%" />
      <div style={{ position: "absolute", left: SAFE_X, top: SAFE_Y + 34, display: "flex", alignItems: "center", gap: 20 }}>
        <LarderMark size={84} color={C.parchment} />
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 72, color: C.parchment }}>Larder</div>
      </div>
      <div style={{ position: "absolute", left: SAFE_X, top: 330, width: 1100 }}>
        <Words text="Book a walk through." size={156} color={C.parchment} start={4} stagger={7} />
        <Fade from={40} to={dur} inF={10} outF={0}>
          <div style={{ position: "absolute", left: 0, top: 360, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 104, color: C.parchment }}>asklarder.com.au<div style={{ height: 14, width: 560, borderRadius: 7, background: C.saffron, marginTop: 10 }} /></div>
        </Fade>
      </div>
      <div style={{ position: "absolute", right: SAFE_X + 30, top: 270, width: 460, background: C.parchment, borderRadius: 40, padding: 32, transform: `scale(${0.7 + pop * 0.3}) rotate(${(1 - pop) * 5}deg)`, boxShadow: "0 50px 100px rgba(0,0,0,0.4)" }}>
        <Img src={staticFile(A.img.qr)} style={{ width: "100%", display: "block" }} />
        <div style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 36, color: C.ink, textAlign: "center", marginTop: 12 }}>SCAN TO VISIT</div>
      </div>
    </Shell>
  );
};
