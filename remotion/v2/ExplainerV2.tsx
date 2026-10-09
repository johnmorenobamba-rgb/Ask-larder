import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { C, FPS, sec } from "./brand";
import { A } from "./assets";
import { DuotoneDefs, useBrandFonts } from "./fx";
import { SceneAsk, SceneBubble, SceneCta, SceneFailed, SceneForms, SceneOwner, SceneStations, SceneTaps, SceneWantTap } from "./scenes";

// Main film: 60 s. Scene lengths in seconds, in the order of video-v2-plan/PLAN.md (pain, tap tap tap, proof, call to action).
const MAIN = {
  forms: sec(5), bubble: sec(6), want: sec(4), taps: sec(11), failed: sec(6), owner: sec(9.5), ask: sec(9.5), stations: sec(5), cta: sec(4),
};
export const EXPLAINER_V2_FRAMES = Object.values(MAIN).reduce((a, b) => a + b, 0); // 1800 frames = 60 s
export const CUTDOWN_FRAMES = sec(15);
export { FPS };

// The tap counter shows the taps at the moments they happen in the recorded clip, relative to the scene start.
const tapRel = (clipStart: number, rate = 1) => A.clips.threeTaps.taps.map((f) => Math.max(8, Math.round((f - clipStart) / rate)));

export const ExplainerV2: React.FC = () => {
  useBrandFonts();
  const t = A.clips.threeTaps;
  const clipStart = Math.max(0, t.taps[0] - 50); // start about 1.7 s before the first tap
  // each scene starts where the one before it ends
  const keys = Object.keys(MAIN) as (keyof typeof MAIN)[];
  const start = {} as Record<keyof typeof MAIN, number>;
  keys.reduce((acc, k) => { start[k] = acc; return acc + MAIN[k]; }, 0);
  const seq = (k: keyof typeof MAIN, node: React.ReactNode) => (
    <Sequence key={k} from={start[k]} durationInFrames={MAIN[k]}>
      {node}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DuotoneDefs />
      {seq("forms", <SceneForms id="s1" dur={MAIN.forms} />)}
      {seq("bubble", <SceneBubble id="s2" dur={MAIN.bubble} wipeFrom={C.ink} />)}
      {seq("want", <SceneWantTap id="s3" dur={MAIN.want} wipeFrom={C.red} />)}
      {seq("taps", <SceneTaps id="s4" dur={MAIN.taps} wipeFrom={C.parchment} clipStart={clipStart} tapFrames={tapRel(clipStart)} />)}
      {seq("failed", <SceneFailed id="s5" dur={MAIN.failed} wipeFrom={C.ink} />)}
      {seq("owner", <SceneOwner id="s6" dur={MAIN.owner} wipeFrom={C.red} />)}
      {seq("ask", <SceneAsk id="s7" dur={MAIN.ask} wipeFrom={C.parchment} />)}
      {seq("stations", <SceneStations id="s8" dur={MAIN.stations} wipeFrom={C.ink} clipStart={A.clips.stations.startFrom} />)}
      {seq("cta", <SceneCta id="s9" dur={MAIN.cta} wipeFrom={C.green} />)}
    </AbsoluteFill>
  );
};

// Cutdown: 15 s. So many forms, three taps, one screen for the owner, call to action.
export const ExplainerV2Cutdown: React.FC = () => {
  useBrandFonts();
  const t = A.clips.threeTaps;
  const clipStart = Math.max(0, t.taps[0] - 30);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DuotoneDefs />
      <Sequence from={0} durationInFrames={sec(3)}>
        <SceneForms id="c1" dur={sec(3)} short />
      </Sequence>
      <Sequence from={sec(3)} durationInFrames={sec(6)}>
        <SceneTaps id="c2" dur={sec(6)} wipeFrom={C.ink} clipStart={clipStart} tapFrames={tapRel(clipStart, 1.5)} rate={1.5} compact />
      </Sequence>
      <Sequence from={sec(9)} durationInFrames={sec(3)}>
        <SceneOwner id="c3" dur={sec(3)} wipeFrom={C.ink} />
      </Sequence>
      <Sequence from={sec(12)} durationInFrames={sec(3)}>
        <SceneCta id="c4" dur={sec(3)} wipeFrom={C.parchment} />
      </Sequence>
    </AbsoluteFill>
  );
};
