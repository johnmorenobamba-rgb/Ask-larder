// No `server-only` guard, matching ingestModule.ts's own precedent: every
// caller of this factory (generateSopDocument, the Block T curation/
// determination passes) needs to stay importable from a standalone Node/tsx
// script for headless testing, not just from Next API routes. `server-only`
// throws unconditionally outside Next's bundler rather than only when
// actually reached from a client bundle, so it can't be used here and still
// support that.
import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
