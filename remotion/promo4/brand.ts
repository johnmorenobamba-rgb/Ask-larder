// Larder Branding Kit tokens for promo v4 (CLAUDE.md). Display Space Grotesk, body Inter, utility IBM Plex Mono.
// Parchment and Saffron are brand supplied (the Cinetic house bans on cream and amber do not apply to a supplied brand).
export const C = {
  ink: '#1F1B16',
  parchment: '#F2E9D8', // cinetic:brand-supplied cream
  red: '#B23A2C', // Preserve Red: the app's own buttons and alerts, nothing decorative
  saffron: '#E8A93B', // cinetic:brand-supplied amber. Meaning: a staff question (the travelling chit bubble)
  bay: '#55603C',
  clay: '#7A5C43',
  paper: '#F2E9D8', // card faces are Parchment (the motion research proposed a lighter tint; kept to the palette)
  stage: '#EBE0CB', // the solution stage: Parchment mixed 6 percent toward Clay, so Parchment surfaces separate from it
  night: '#1F1B16', // the pain stage
  inkSoft: 'rgba(31,27,22,0.62)',
} as const;
export const FONT = {
  display: '"Space Grotesk", sans-serif',
  text: '"Inter", sans-serif',
  mono: '"IBM Plex Mono", monospace',
} as const;
// The mark (src/components/shared/LarderMark.tsx, remotion/v2/brand.ts). viewBox 0 0 72 72; the left edge leans.
export const BUBBLE_PATH = 'M10 14a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H31l-14 13V52h-9a8 8 0 0 1-8-8z';
