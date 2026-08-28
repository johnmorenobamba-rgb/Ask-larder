import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
