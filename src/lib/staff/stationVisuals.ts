// Personal Dashboard spec's "Stations gallery" wants a fill color, icon
// glyph, and department tag per station, but the real `stations` table
// (Tech Bible §15a) only has `name` and `qr_code_slug` — no color, icon, or
// department column. Rather than a schema change (confirmed with John:
// infer instead), both the glyph and department tag are derived from a
// keyword match against the station's real name, with a generic fallback
// for anything unrecognized. Zero migration, works immediately for any
// station a venue adds.

export const STATION_PALETTE = [
  "var(--color-clay-brown)",
  "var(--color-bay-green)",
  "var(--color-preserve-red)",
  "var(--color-ink)",
] as const;

export type StationGlyphKey = "coffee" | "fridge" | "bar" | "pass" | "generic";

const KEYWORD_RULES: { pattern: RegExp; department: string; glyph: StationGlyphKey }[] = [
  { pattern: /coffee|espresso|barista/i, department: "Bar", glyph: "coffee" },
  { pattern: /\bbar\b|cocktail|wine|spirits/i, department: "Bar", glyph: "bar" },
  { pattern: /fridge|freezer|walk-?in|cool ?room|cold storage/i, department: "Kitchen", glyph: "fridge" },
  { pattern: /pass|kitchen|grill|stove|oven|prep|wash|dish/i, department: "Kitchen", glyph: "pass" },
];

export function getStationVisuals(name: string, index: number) {
  const match = KEYWORD_RULES.find((rule) => rule.pattern.test(name));
  return {
    fillColor: STATION_PALETTE[index % STATION_PALETTE.length],
    department: match?.department ?? "Station",
    glyph: match?.glyph ?? ("generic" as StationGlyphKey),
    number: String(index + 1).padStart(2, "0"),
  };
}
