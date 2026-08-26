import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md at the repo root is our real, hand-maintained project doc (mirrored in Notion) —
  // disable Next's auto-appended agent-rules block so `next dev`/`next build` don't dirty it.
  agentRules: false,
};

export default nextConfig;
