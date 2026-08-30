"use client";

import { usePathname } from "next/navigation";
import { LarderMark } from "@/components/shared/LarderMark";

// Only the linear new-hire flow gets this chrome (New-Hire Flow spec's
// "0. Global chrome") — the ongoing app (home/modules/certs/settings) uses
// StaffNav instead. Self-hides by route so both can mount unconditionally
// in the protected layout without needing server-side route awareness.
const ONBOARDING_SEGMENTS = ["welcome", "roles", "signature", "complete", "intro"];

export function StaffTopBar({ venueName }: { venueName: string }) {
  const pathname = usePathname();
  const segment = pathname?.split("/")[2];
  if (!segment || !ONBOARDING_SEGMENTS.includes(segment)) return null;

  return (
    <div className="flex items-center gap-2 px-6 py-4">
      <LarderMark size={20} />
      <span className="font-display text-sm font-bold text-ink">{venueName}</span>
    </div>
  );
}
