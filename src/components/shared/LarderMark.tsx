// The chit-shaped speech-bubble mark — Larder's one icon, reused everywhere
// (top bar, Ask Larder trigger, splash). Static render; see ChitMark for
// the draw-in/settle/traveling-glow-trace sequence built from the same
// path, used on the Ask Larder tile/bubble and the cold-load splash.
export const LARDER_MARK_PATH =
  "M12 14a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H30l-12 12V48h-6a6 6 0 0 1-6-6z";

// Block L5/L6 -- a chunkier variant of the same chit silhouette (bigger
// corner radius, fuller tail). MorphSVG morphs the traced thin outline
// into this for the splash's "settle into a bolder state" beat (L5) and
// the Ask Larder trigger's tap-activation flex beat (L6) -- one shared
// constant so both stay the same shape rather than drifting apart as two
// separate hand-tuned path strings.
export const LARDER_MARK_PATH_BOLD =
  "M10 14a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H31l-14 13V52h-9a8 8 0 0 1-8-8z";

export function LarderMark({
  size = 24,
  color = "var(--color-ink)",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="Larder" className={className}>
      <path d={LARDER_MARK_PATH} fill={color} />
    </svg>
  );
}
