// remotion/promo4/fx/Chit.tsx
import React from 'react';
import { C, FONT } from '../brand';

/** The mark's shape at any size: body w x h px, tail below-left, the left edge leaning like the mark. */
export const chitPath = (w: number, h: number, s = h / 46) => {
  const r = 8 * s, lean = 10 * s, t0 = 17 * s, t1 = 31 * s, drop = 13 * s;
  return `M${lean} ${r}a${r} ${r} 0 0 1 ${r} ${-r}H${w - r}a${r} ${r} 0 0 1 ${r} ${r}V${h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${t1}l${t0 - t1} ${drop}V${h}H${r}a${r} ${r} 0 0 1 ${-r} ${-r}z`;
};

export const Chit: React.FC<{
  w: number; h: number; text: string; fill?: string; ink?: string; size?: number; family?: string; style?: React.CSSProperties;
}> = ({ w, h, text, fill = C.saffron, ink = C.ink, size = 60, family = FONT.display, style }) => {
  const s = h / 46;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h + 13 * s, ...style }}>
      <svg width={w} height={h + 13 * s} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d={chitPath(w, h, s)} fill={fill} />
      </svg>
      <div style={{ position: 'absolute', left: 10 * s + 28, right: 28, top: 0, height: h, display: 'flex', alignItems: 'center',
        fontFamily: family, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </div>
  );
};
