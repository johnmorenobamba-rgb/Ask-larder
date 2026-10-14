import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { easeOut } from "../v2/brand";
import { PAGE_BG } from "../promo2/kit";
import { useBrandFonts } from "../v2/fx";
import { SceneAsk, SceneClose, SceneHome, SceneHook } from "../promo2/scenes";
import { SceneCert, SceneForms, SceneOwner, SceneStation, SceneTrain } from "./scenes";
import { CUT, CUT_FRAMES, SCENES, TOTAL_FRAMES, type SceneKey } from "./timeline";

export { TOTAL_FRAMES, CUT_FRAMES };

// Larder promo v3: the longer film (73.5 s) and its 30 second cutdown. Silent: on screen text plus a quiet synthesised sound bed.
// Render with: npx remotion render remotion/index.ts LarderPromo3 out/larder-promo-v3.mp4 --public-dir remotion/public-promo3

// The scene underneath is Parchment, so a scene that fades out and the next one fading in never dips to a dark frame.
// The outgoing scene is gone before the incoming one starts to fade in, so two lines of text are never on screen together.
const FadeOut: React.FC<{ dur: number; ov: number; children: React.ReactNode }> = ({ dur, ov, children }) => {
  const f = useCurrentFrame();
  const o = 1 - easeOut(interpolate(f, [dur - ov, dur - ov + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
// scenes followed by a Parchment fade in (the hook and the owner scene hand over to a wipe instead)
const FADES_OUT: SceneKey[] = ["home", "ask", "station", "forms", "cert", "train"];

// The reused Ask scene fades in from its first frame, so hold that back until the scene before it has gone.
const LateIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [6, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
};

const NODES: Record<SceneKey, React.ReactNode> = {
  hook: <SceneHook />,
  home: <SceneHome />,
  ask: (
    <LateIn>
      <SceneAsk />
    </LateIn>
  ),
  station: <SceneStation />,
  forms: <SceneForms />,
  cert: <SceneCert />,
  train: <SceneTrain />,
  owner: <SceneOwner />,
  close: <SceneClose />,
};

export const Promo3: React.FC = () => {
  useBrandFonts();
  return (
    <AbsoluteFill style={{ background: PAGE_BG }}>
      {(Object.keys(SCENES) as SceneKey[]).map((k) => (
        <Sequence key={k} from={SCENES[k].from} durationInFrames={SCENES[k].dur}>
          {FADES_OUT.includes(k) ? <FadeOut dur={SCENES[k].dur} ov={14}>{NODES[k]}</FadeOut> : NODES[k]}
        </Sequence>
      ))}
      <Audio src={staticFile("audio/promo3-mix.wav")} />
    </AbsoluteFill>
  );
};

// A scene entered part way through has already played its own fade in, so the cutdown adds one.
const CutIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: easeOut(interpolate(f, [8, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>{children}</AbsoluteFill>;
};

export const Promo3Cut: React.FC = () => {
  useBrandFonts();
  return (
    <AbsoluteFill style={{ background: PAGE_BG }}>
      {CUT.map((s) => {
        const node = s.scene === "station" ? <SceneStation enter="wipe" /> : NODES[s.scene];
        const shifted = s.offset > 0 ? (
          <CutIn>
            <Sequence from={-s.offset}>{node}</Sequence>
          </CutIn>
        ) : (
          node
        );
        const wrapped = ["station", "ask", "forms"].includes(s.scene) ? <FadeOut dur={s.dur} ov={16}>{shifted}</FadeOut> : shifted;
        return (
          <Sequence key={s.scene} from={s.from} durationInFrames={s.dur}>
            {wrapped}
          </Sequence>
        );
      })}
      <Audio src={staticFile("audio/promo3-cut-mix.wav")} />
    </AbsoluteFill>
  );
};
