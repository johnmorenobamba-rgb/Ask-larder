"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LarderMark } from "@/components/shared/LarderMark";
import { NavDrawer } from "@/components/staff/NavDrawer";

// Personal Dashboard spec, Navigation (REVISED 29 Aug 2026): replaces the
// persistent tab bar. Same route scope as the bar it replaces (self-hides
// outside the ongoing app's four sections) — the linear new-hire flow
// still uses StaffTopBar.
const NAV_SEGMENTS = ["home", "modules", "certs", "settings"];

/**
 * The tradeoff the spec calls out explicitly: a hamburger trades the tab
 * bar's constant destination-visibility for header space, which is only
 * acceptable if the *way to reach* those destinations never disappears —
 * so this header is `fixed`, not `sticky` (sticky's guarantee depends on
 * an ancestor not clipping/overflow-hiding it; fixed has no such
 * precondition to get wrong), and unlike the old StaffNav there's no
 * mobile-bottom/desktop-top split to reason about — it's one placement,
 * pinned, always.
 */
export function StaffHeader({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  const pathname = usePathname();
  const segment = pathname?.split("/")[2];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!segment || !NAV_SEGMENTS.includes(segment)) return null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 md:px-6">
        <Link href={`/${venueSlug}/home`} className="flex items-center gap-2">
          <LarderMark size={22} color="var(--color-parchment)" />
          <span className="font-display text-base font-bold text-parchment">Larder</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-sans text-sm text-parchment/80">{venueName}</span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center"
          >
            <HamburgerIcon open={open} />
          </button>
        </div>
      </header>
      <NavDrawer venueSlug={venueSlug} activeSegment={segment} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-5 w-6 flex-col justify-between">
      <span
        className={`h-0.5 w-full rounded-full bg-parchment transition-transform duration-240 ${
          open ? "translate-y-[9px] rotate-45" : ""
        }`}
      />
      <span
        className={`h-0.5 w-full rounded-full bg-parchment transition-opacity duration-240 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`h-0.5 w-full rounded-full bg-parchment transition-transform duration-240 ${
          open ? "-translate-y-[9px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}
