import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ChitMark } from "@/components/shared/ChitMark";

// Block N3 Stage 2 -- de-risk spike. Confirms the real ChitMark component
// (imported unmodified, not a copy) renders its idle traced-glow loop
// correctly frame-by-frame in an actual `npx remotion render`, not just
// Remotion Studio's real-time preview (which would falsely look fine even
// if the underlying frame-seek math were wrong).
export function ChitMarkTest() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <ChitMark size={200} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" driveFrameSeconds={frame / fps} />
    </AbsoluteFill>
  );
}
