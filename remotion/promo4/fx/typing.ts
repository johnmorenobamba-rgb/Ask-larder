// remotion/promo4/fx/typing.ts
import { rand, E } from '../lib/anim';
/** Frame each character appears, `start` to `end` (absolute or act local), most characters early (E.type). */
export const typeSchedule = (text: string, start: number, end: number, seed = 'k') => {
  const w = [...text].map((ch, i) => {
    let x = 0.75 + rand(`${seed}${i}`) * 0.6;
    if (ch === ' ') x *= 0.7;
    if (text[i - 1] === '?' || text[i - 1] === '.') x += 2.2;
    return x;
  });
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return w.map((x) => start + E.type((acc += x) / total) * (end - start));
};
