// Shared enforcement for CLAUDE.md's absolute no-dashes rule, for every AI
// generation path that produces staff/owner-facing copy. Real bug found live
// 14 Sep 2026 (equipment-content pipeline + the SOP document resynthesis
// step): prompt instructions alone don't reliably hold -- some rows shipped
// a real em dash, and a few even shipped the literal six-character text of
// the character's own unicode escape sequence ("—"), rendering raw on
// screen. This is the deterministic safety net underneath the prompt
// instruction, not a replacement for it -- always add the prompt-level
// instruction too, this only catches what the instruction misses.
const DASH_CHAR_RE = /[‐-―]/;
const ESCAPED_DASH_RE = /\\u00(2d|2D)|\\u201[0-5]/;

export function hasDashViolation(text: string): boolean {
  return DASH_CHAR_RE.test(text) || ESCAPED_DASH_RE.test(text);
}

/** True if any string reachable inside `value` (recursing through arrays/objects) has a dash violation. */
export function hasDashViolationDeep(value: unknown): boolean {
  if (typeof value === "string") return hasDashViolation(value);
  if (Array.isArray(value)) return value.some(hasDashViolationDeep);
  if (value && typeof value === "object") return Object.values(value).some(hasDashViolationDeep);
  return false;
}

/**
 * Absolute last resort if a real rewrite attempt still leaves a dash behind
 * -- a mechanical comma is worse prose than a real rewrite, but a silently
 * broken escape sequence or a hard "—" reaching a real screen is worse than
 * that. Prefer calling the model for a real rewrite first; only fall back to
 * this after that's been tried.
 */
export function stripDashArtifacts(text: string): string {
  return text
    .replace(/\\u00(2d|2D)/g, ",")
    .replace(/\\u201[0-5]/g, ",")
    .replace(/[‐-―]/g, ",")
    .replace(/ ,/g, ",")
    .replace(/,{2,}/g, ",");
}

export const NO_DASH_INSTRUCTION =
  'Never use a hyphen, en dash, or em dash as punctuation anywhere -- not standalone, not for an aside, not for a numeric range ("9am to 5pm," never "9am-5pm"). Rewrite the sentence structure around it; don\'t substitute a comma in the exact same spot. Genuine compound words (self-serve, e-signature) are fine, that\'s spelling, not punctuation. Never write the literal text of a unicode escape sequence for a dash either (like \\u2014) -- that string of characters is the same violation as the character itself.';
