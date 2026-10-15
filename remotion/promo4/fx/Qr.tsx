// remotion/promo4/fx/Qr.tsx: a real QR as ONE path (1 DOM node, not 1000 rects)
import React from 'react';
import QRCode from 'qrcode';
const cache = new Map<string, { d: string; n: number }>();
export const qrPath = (text: string) => {
  if (!cache.has(text)) {
    const q = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const n = q.modules.size; let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    cache.set(text, { d, n });
  }
  return cache.get(text)!;
};
export const Qr: React.FC<{ text: string; size: number; color: string; bg: string }> = ({ text, size, color, bg }) => {
  const { d, n } = qrPath(text);
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" style={{ display: 'block', background: bg }}>
      <path d={d} fill={color} />
    </svg>
  );
};
