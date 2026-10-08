import { Easing } from "remotion";

// Video v2 constants. Palette from the Branding Kit (CLAUDE.md). No other colours.
export const C = {
  ink: "#1F1B16",
  parchment: "#F2E9D8",
  red: "#B23A2C",
  saffron: "#E8A93B",
  green: "#55603C",
  clay: "#7A5C43",
} as const;

export const W = 1920;
export const H = 1080;
export const FPS = 30;
// nothing important in the outer 5 percent of the frame
export const SAFE_X = Math.round(W * 0.05);
export const SAFE_Y = Math.round(H * 0.05);

export const FONT_DISPLAY = '"Space Grotesk", sans-serif';
export const FONT_BODY = '"Inter", sans-serif';
export const FONT_MONO = '"IBM Plex Mono", monospace';

// deliberate easing: out for things that enter, in out for moves inside the frame
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeWipe = Easing.bezier(0.7, 0, 0.2, 1);

// The Larder chit speech bubble (same path as src/components/shared/LarderMark.tsx, 72 unit box)
export const BUBBLE_PATH =
  "M10 14a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H31l-14 13V52h-9a8 8 0 0 1-8-8z";

export const sec = (s: number) => Math.round(s * FPS);
