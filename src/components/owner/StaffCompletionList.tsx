"use client";

import { useEffect, useState } from "react";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";

export type StaffCompletionRow = {
  id: string;
  name: string;
  roleName: string;
  completed: number;
  total: number;
};

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function CompletionRing({
  fraction,
  animate,
  size = 48,
}: {
  fraction: number;
  animate: boolean;
  size?: number;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - (animate ? fraction : 0));
  return (
    <svg className="-rotate-90 shrink-0" style={{ width: size, height: size }} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="var(--color-clay-brown)" strokeOpacity="0.2" strokeWidth="4" />
      <circle
        cx="24"
        cy="24"
        r={RING_RADIUS}
        fill="none"
        stroke="var(--color-bay-green)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 600ms ease-out" }}
      />
    </svg>
  );
}

/**
 * Block J6's original per-staff elevated ring list, extracted as its own
 * reusable component in Block K3 -- the home dashboard grid now shows only
 * a team-wide summary cell, and this full list moved to its own detail
 * screen (the owner's Staff page) reachable by tapping that cell, per the
 * Owner Admin Panel spec v2. Same `ElevatedCell` rings, same staggered
 * entrance, just relocated rather than rebuilt.
 */
export function StaffCompletionList({ staff }: { staff: StaffCompletionRow[] }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (staff.length === 0) {
    return <p className="font-sans text-sm text-clay-brown">No staff yet.</p>;
  }

  return (
    <div className="space-y-2">
      {staff.map((s, i) => {
        const fraction = s.total > 0 ? s.completed / s.total : 0;
        return (
          <ElevatedCell
            key={s.id}
            glowColor="var(--color-bay-green)"
            floatDurationS={5.7 + (i % 5) * 0.15}
            floatDelayS={(i % 5) * 0.2}
            className="flex items-center gap-3 rounded-2xl bg-parchment px-4 py-3"
          >
            <CompletionRing fraction={fraction} animate={entered} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-ink">{s.name}</p>
              <p className="font-mono text-xs text-clay-brown">{s.roleName}</p>
            </div>
            <p className="font-mono text-sm text-ink">
              <AnimatedNumber value={s.completed} animate={entered} />/<AnimatedNumber value={s.total} animate={entered} />
            </p>
          </ElevatedCell>
        );
      })}
    </div>
  );
}
