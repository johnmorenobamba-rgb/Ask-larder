import { AbsoluteFill } from "remotion";
import { BentoGrid } from "@/components/staff/BentoGrid";
import twoFiresHome from "../data/two-fires-home.json";

// Block N3 Stage 3 -- de-risk spike #2. Confirms the REAL BentoGrid
// component (imported unmodified) renders correctly with real Two Fires
// data outside of Next.js -- Tailwind v4 tokens/keyframes, the
// next/navigation stub, and static data all wired together.
export function BentoGridTest() {
  return (
    <AbsoluteFill className="bg-parchment">
      {/* @ts-expect-error -- JSON import loses the certRows status union type, values are real */}
      <BentoGrid {...twoFiresHome} />
    </AbsoluteFill>
  );
}
