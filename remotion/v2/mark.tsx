import React from "react";
import { BUBBLE_PATH } from "./brand";

// The Larder chit speech bubble mark (same path as src/components/shared/LarderMark.tsx).
export const LarderMark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 72 72">
    <path d={BUBBLE_PATH} fill={color} />
  </svg>
);
