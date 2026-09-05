import "../src/app/globals.css";
import "./remotion-overrides.css";
import { Composition } from "remotion";
import { ChitMarkTest } from "./compositions/ChitMarkTest";
import { BentoGridTest } from "./compositions/BentoGridTest";
import { OwnerDashboardTest } from "./compositions/OwnerDashboardTest";
import { Explainer, EXPLAINER_DURATION_FRAMES, EXPLAINER_FPS } from "./compositions/Explainer";
import { HeroTileDrop, HERO_TILE_DROP_DURATION } from "./compositions/HeroTileDrop";

// Block N3 -- imports the REAL app stylesheet (not a copy) so color
// tokens, fonts-as-CSS-vars, and the bento texture/keyframe classes never
// drift from the live product.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChitMarkTest"
        component={ChitMarkTest}
        durationInFrames={78} // 2.6s idle-trace loop x1 at 30fps
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="BentoGridTest"
        component={BentoGridTest}
        durationInFrames={60}
        fps={30}
        width={800}
        height={1400}
      />
      <Composition
        id="OwnerDashboardTest"
        component={OwnerDashboardTest}
        durationInFrames={60}
        fps={30}
        width={1000}
        height={700}
      />
      <Composition
        id="Explainer"
        component={Explainer}
        durationInFrames={EXPLAINER_DURATION_FRAMES}
        fps={EXPLAINER_FPS}
        width={1080}
        height={1080}
      />
      <Composition
        id="HeroTileDrop"
        component={HeroTileDrop}
        durationInFrames={HERO_TILE_DROP_DURATION}
        fps={30}
        width={720}
        height={540}
      />
    </>
  );
};
