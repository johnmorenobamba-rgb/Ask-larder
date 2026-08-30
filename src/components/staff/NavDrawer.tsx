"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LarderMark } from "@/components/shared/LarderMark";
import { SPRING_PRESS } from "@/lib/motion/springPress";

const MotionLink = motion.create(Link);

const ITEMS = [
  { segment: "home", label: "Home" },
  { segment: "modules", label: "Modules" },
  { segment: "certs", label: "Certificates" },
  { segment: "settings", label: "Settings" },
] as const;

function ModulesIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="13" height="9" rx="2" stroke={color} strokeWidth="1.5" />
      <rect x="7" y="5" width="13" height="9" rx="2" fill="var(--color-parchment)" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function CertificatesIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <line x1="12" y1="12" x2="12" y2="6.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill={color} />
    </svg>
  );
}

/**
 * Personal Dashboard spec, Navigation (REVISED 29 Aug 2026) — the drawer
 * behind StaffHeader's hamburger. Same four destinations, icons, and
 * active-state treatment as the superseded persistent tab bar, now in a
 * vertical slide-in list. Always mounted (visibility driven by CSS
 * transition classes, not conditional render) so open AND close both get
 * the same ~240ms animation symmetrically, with no JS timeout/state-machine
 * needed to sequence an unmount after an exit animation.
 */
export function NavDrawer({
  venueSlug,
  activeSegment,
  open,
  onClose,
}: {
  venueSlug: string;
  activeSegment: string;
  open: boolean;
  onClose: () => void;
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
        className={`relative flex h-full w-72 flex-col gap-1 bg-parchment px-4 pt-24 pb-6 transition-transform duration-240 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {ITEMS.map((item) => {
          const href = `/${venueSlug}/${item.segment}`;
          const active = activeSegment === item.segment;
          const color = active ? "var(--color-ink)" : "var(--color-clay-brown)";
          return (
            <MotionLink
              key={item.segment}
              href={href}
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_PRESS}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
            >
              {item.segment === "home" && <LarderMark size={22} color={color} />}
              {item.segment === "modules" && <ModulesIcon color={color} />}
              {item.segment === "certs" && <CertificatesIcon color={color} />}
              {item.segment === "settings" && <SettingsIcon color={color} />}
              <span
                className={`font-mono text-xs uppercase tracking-wide ${active ? "text-preserve-red" : "text-clay-brown"}`}
              >
                {item.label}
              </span>
            </MotionLink>
          );
        })}
      </div>
    </div>
  );
}
