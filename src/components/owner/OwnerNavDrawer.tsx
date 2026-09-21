"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/motion/springPress";

const MotionLink = motion.create(Link);

const SECTIONS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "staff", label: "Staff" },
  { href: "completions", label: "Completions" },
  { href: "certs", label: "Certificates" },
  { href: "modules", label: "Modules" },
  { href: "sops", label: "SOPs" },
  { href: "weekly-report", label: "Weekly report" },
  { href: "escalations", label: "Escalations" },
  { href: "near-misses", label: "Near-misses" },
  { href: "stations", label: "Stations" },
  { href: "photo-library", label: "Photos" },
  { href: "contacts", label: "Contacts" },
  { href: "suggestions", label: "Suggestions" },
  { href: "settings", label: "Settings" },
];

/**
 * The owner-side counterpart to staff/NavDrawer.tsx -- same slide-in panel
 * behind a fixed header's hamburger, same always-mounted/CSS-transition
 * approach so open and close share one symmetric animation. Text-only (no
 * per-item icons): staff's drawer has 4 destinations that warrant one each,
 * this has 12, so a plain mono-label list stays legible instead of forcing
 * icons onto items that don't have an obvious one.
 */
export function OwnerNavDrawer({
  venueSlug,
  activeSegment,
  open,
  onClose,
  onSignOut,
}: {
  venueSlug: string;
  activeSegment: string;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-240 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-ink/45" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex h-full w-72 flex-col gap-1 overflow-y-auto bg-parchment px-4 pt-24 pb-6 transition-transform duration-240 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {SECTIONS.map((s) => {
          const active = activeSegment === s.href;
          return (
            <MotionLink
              key={s.href}
              href={`/${venueSlug}/owner/${s.href}`}
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_PRESS}
              className="rounded-xl px-3 py-3"
            >
              <span
                className={`font-mono text-xs uppercase tracking-wide ${
                  active ? "text-preserve-red" : "text-clay-brown"
                }`}
              >
                {s.label}
              </span>
            </MotionLink>
          );
        })}
        <div className="my-2 border-t border-clay-brown/20" />
        <motion.button
          type="button"
          onClick={onSignOut}
          whileTap={{ scale: 0.97 }}
          transition={SPRING_PRESS}
          className="rounded-xl px-3 py-3 text-left"
        >
          <span className="font-mono text-xs uppercase tracking-wide text-clay-brown">Log out</span>
        </motion.button>
      </div>
    </div>
  );
}
