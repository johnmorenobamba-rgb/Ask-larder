// remotion/promo4/fx/SubSamples.tsx
import React from 'react';
/** Wrap ONLY the moving subtree. n = 1 renders once; pick n from the measured speed: ceil(px_per_f / 12), max 5. */
export const SubSamples: React.FC<{ frame: number; n: number; shutter?: number; lo?: number; hi?: number; render: (f: number) => React.ReactNode }> = ({ frame, n, shutter = 180, lo = -Infinity, hi = Infinity, render }) => {
  if (n <= 1) return <>{render(frame)}</>;
  const span = shutter / 360;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const t = Math.min(hi, Math.max(lo, frame + span * ((i + 0.5) / n - 0.5))); // clamp inside the act: cuts stay crisp
        return <div key={i} style={{ position: 'absolute', inset: 0, opacity: 1 / (i + 1) }}>{render(t)}</div>;
      })}
    </>
  );
};
// usage: <SubSamples frame={f} n={speed(f) > 12 ? 4 : 1} lo={ACT.hook.from} hi={ACT.hook.to - 1e-3} render={(t) => <HookStack frame={t} />} />
// for a third party component that reads useCurrentFrame(): render={(t) => <Freeze frame={t}><Thing /></Freeze>}
