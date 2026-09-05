import { interpolate, spring } from "remotion";

const FPS = 30;

/**
 * Block N3 v3 -- three new reusable text techniques requested directly
 * (large bold text covering ~80% of the frame, text that grows to fill
 * the screen, scrolling text) per the Creative Auditor's spec. Built once
 * here, reused across beats, not re-implemented per beat.
 */

/** Static "already huge" treatment -- arrives at ~80% frame coverage, no growth animation (the beat's own entrance handles arrival). */
export function MegaType({
  children,
  color,
  className = "font-display",
  widthPct = 86,
}: {
  children: React.ReactNode;
  color: string;
  className?: string;
  widthPct?: number;
}) {
  return (
    <div
      className={`text-center font-bold ${className}`}
      style={{
        color,
        fontSize: "min(22vw, 22vh)",
        lineHeight: 0.95,
        letterSpacing: "-0.02em",
        width: `${widthPct}%`,
      }}
    >
      {children}
    </div>
  );
}

/** Grows from near-zero to frame-filling with a spring overshoot -- the motion IS the point, distinct from MegaType's static arrival. */
export function GrowFill({
  children,
  color,
  frame,
  startFrame = 0,
  className = "font-display",
}: {
  children: React.ReactNode;
  color: string;
  frame: number;
  startFrame?: number;
  className?: string;
}) {
  const local = Math.max(0, frame - startFrame);
  const p = spring({ frame: local, fps: FPS, config: { damping: 15, mass: 0.8 } });
  const scale = interpolate(p, [0, 1], [0.08, 1]);
  return (
    <div
      className={`text-center font-bold ${className}`}
      style={{
        color,
        fontSize: "min(22vw, 22vh)",
        lineHeight: 0.95,
        letterSpacing: "-0.02em",
        width: "86%",
        transform: `scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      {children}
    </div>
  );
}

/** Seamless horizontal marquee, decelerating to a stop over the final `decelFrames`. */
export function Marquee({
  text,
  frame,
  totalFrames,
  decelFrames = 8,
  speedPxPerFrame = 8.7,
  color,
  className = "font-display",
}: {
  text: string;
  frame: number;
  totalFrames: number;
  decelFrames?: number;
  speedPxPerFrame?: number;
  color: string;
  className?: string;
}) {
  const decelStart = totalFrames - decelFrames;
  let distance: number;
  if (frame < decelStart) {
    distance = frame * speedPxPerFrame;
  } else {
    const decelP = interpolate(frame, [decelStart, totalFrames], [0, 1], { extrapolateRight: "clamp" });
    const decelDistance = speedPxPerFrame * decelFrames * (1 - (1 - decelP) * (1 - decelP));
    distance = decelStart * speedPxPerFrame + decelDistance;
  }
  const offset = -(distance % 2000);
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 110, maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)" }}>
      <div className="absolute whitespace-nowrap" style={{ transform: `translateX(${offset}px)`, top: 0 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`inline-block px-8 font-bold ${className}`} style={{ color, fontSize: 90 }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Continuous vertical scroll of rows, with an optional row that flips state partway through. */
export function ScrollList({
  rows,
  frame,
  speedPxPerFrame = 6,
  rowHeight = 56,
  flipAtRowIndex,
  flipAtFrame,
}: {
  rows: { label: string; sub: string }[];
  frame: number;
  speedPxPerFrame?: number;
  rowHeight?: number;
  flipAtRowIndex?: number;
  flipAtFrame?: number;
}) {
  const y = frame * speedPxPerFrame;
  const totalHeight = rows.length * rowHeight;
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 480, maskImage: "linear-gradient(180deg, transparent, black 15%, black 85%, transparent)" }}
    >
      <div className="absolute w-full" style={{ transform: `translateY(${-(y % totalHeight)}px)` }}>
        {Array.from({ length: 3 }).map((_, loop) =>
          rows.map((row, i) => {
            const isFlipped = flipAtRowIndex === i && flipAtFrame !== undefined && frame >= flipAtFrame && loop === 0;
            return (
              <div
                key={`${loop}-${i}`}
                className="flex items-center justify-between px-10 font-mono text-2xl"
                style={{ height: rowHeight, color: isFlipped ? "var(--color-preserve-red)" : "var(--color-clay-brown)" }}
              >
                <span>{row.label}</span>
                <span className="font-bold">{isFlipped ? "EXPIRED" : row.sub}</span>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
