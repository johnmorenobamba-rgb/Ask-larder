import { AbsoluteFill } from "remotion";
import { OwnerDashboardBoard } from "@/components/owner/OwnerDashboardBoard";
import twoFiresOwner from "../data/two-fires-owner.json";

// Block N3 Stage 4 -- de-risk spike #3. Confirms the REAL
// OwnerDashboardBoard component (imported unmodified) renders correctly
// with real Two Fires owner-side data -- next/link stub, Tailwind, and
// static data all together.
export function OwnerDashboardTest() {
  return (
    <AbsoluteFill className="bg-parchment p-6">
      {/* @ts-expect-error -- JSON import loses the FlagTier/FlagGlyphKey union types, values are real */}
      <OwnerDashboardBoard {...twoFiresOwner} />
    </AbsoluteFill>
  );
}
