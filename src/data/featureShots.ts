import manifest from "./feature-shots.json";

export type Shot = { src: string; width: number; height: number; blur: string };

// Written by scripts/crop-feature-shots.mjs. Step screenshots are cropped from the demo venue capture library.
export const SHOTS: Record<ShotKey, Shot> = manifest;

export type ShotKey = keyof typeof manifest;
