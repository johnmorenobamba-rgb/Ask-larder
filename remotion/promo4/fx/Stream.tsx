// remotion/promo4/fx/Stream.tsx
import React from 'react';
import { C, FONT } from '../brand';
import { fd, rand, clamp, prog, E } from '../lib/anim';
import { mixColor } from '../lib/color';

/** Frame each word appears: chunks of 1 to 3 words every 2 to 3 frames from `start`. */
export const streamSchedule = (text: string, start: number, seed = 's') => {
  const words = text.split(' ');
  const at: number[] = [];
  let t = start, i = 0, c = 0;
  while (i < words.length) {
    const chunk = 1 + Math.floor(rand(`${seed}c${c}`) * 3);
    for (let j = 0; j < chunk && i < words.length; j++) at[i++] = t;
    t += 2 + Math.floor(rand(`${seed}g${c++}`) * 2);
  }
  return { words, at, end: t };
};

export const Stream: React.FC<{ frame: number; text: string; start: number; size: number; family?: string; width: number }> = ({
  frame: f, text, start, size, family = FONT.text, width,
}) => {
  const { words, at, end } = streamSchedule(text, start);
  const F = fd(f);
  const last = at.filter((t) => t <= F).length - 1;
  return (
    <div style={{ width, fontFamily: family, fontSize: size, lineHeight: 1.45, color: C.ink }}>
      {words.map((w, i) => {
        const shown = F >= at[i];
        const age = clamp((f - at[i]) / 12);
        return (
          <React.Fragment key={i}>
            <span style={{ visibility: shown ? 'visible' : 'hidden', opacity: shown ? prog(f, at[i] - 1, at[i] + 5, E.smooth) : 0,
              color: mixColor(C.clay, C.ink, age) }}>{w}</span>
            {/* no caret: the app shows the finished answer, the film only paces its arrival */}
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </div>
  );
};
