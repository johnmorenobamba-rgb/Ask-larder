// remotion/promo4/fx/Grain.tsx: last child of the film's root, outside every camera
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { fd, rand } from '../lib/anim';

export const Grain: React.FC<{ frame: number; strength?: number }> = ({ frame, strength = 1 }) => {
  const F = fd(frame); // whole frame: blur sub samples share one grain field
  const v = Math.floor(rand(`gv${F}`) * 8);
  const ox = Math.floor(rand(`gx${F}`) * 256) * 2, oy = Math.floor(rand(`gy${F}`) * 256) * 2; // whole px offsets: no resampling
  const layer = (kind: 'add' | 'mul', blend: React.CSSProperties['mixBlendMode']) => (
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`grain/${kind}${v}.png`)})`, backgroundSize: '512px 512px',
      backgroundPosition: `${-ox}px ${-oy}px`, mixBlendMode: blend, opacity: strength, pointerEvents: 'none' }} />
  );
  return <>{layer('add', 'plus-lighter')}{layer('mul', 'multiply')}</>;
};
