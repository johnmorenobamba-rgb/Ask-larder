import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { C } from "../v2/brand";
import { useBrandFonts } from "../v2/fx";
import { SCENES, TOTAL_FRAMES } from "./timeline";
import { SceneAsk, SceneClose, SceneHome, SceneHook, SceneOwner, SceneTrain } from "./scenes";

export { TOTAL_FRAMES };

// Larder promo v2. Silent film: on screen text only, plus a quiet synthesised sound bed.
// Render with: npx remotion render remotion/index.ts LarderPromo2 out/larder-promo-v2.mp4 --public-dir remotion/public-promo2
export const Promo2: React.FC = () => {
  useBrandFonts();
  const seq = (k: keyof typeof SCENES, node: React.ReactNode) => (
    <Sequence key={k} from={SCENES[k].from} durationInFrames={SCENES[k].dur}>
      {node}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {seq("hook", <SceneHook />)}
      {seq("home", <SceneHome />)}
      {seq("ask", <SceneAsk />)}
      {seq("train", <SceneTrain />)}
      {seq("owner", <SceneOwner />)}
      {seq("close", <SceneClose />)}
      <Audio src={staticFile("audio/promo2-mix.wav")} />
    </AbsoluteFill>
  );
};
