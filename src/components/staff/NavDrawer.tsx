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

// Only shown to the B2 audience (BOH staff, manager tier, owners).
const TEMPERATURE_ITEM = { segment: "temperature", label: "Temperature log" } as const;
const FORMS_ITEM = { segment: "forms", label: "Compliance forms" } as const;

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

function ThermometerIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 5a2 2 0 1 1 4 0v8.2a4 4 0 1 1-4 0V5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
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
  showTemperature = false,
}: {
  venueSlug: string;
  activeSegment: string;
  open: boolean;
  onClose: () => void;
  showTemperature?: boolean;
}) {
  const items: readonly { segment: string; label: string }[] = showTemperature
    ? [...ITEMS.slice(0, 3), FORMS_ITEM, TEMPERATURE_ITEM, ...ITEMS.slice(3)]
    : [...ITEMS.slice(0, 3), FORMS_ITEM, ...ITEMS.slice(3)];
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
        {items.map((item) => {
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
              {item.segment === "temperature" && <ThermometerIcon color={color} />}
              {item.segment === "forms" && <FormsIcon color={color} />}
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

function FormsIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M9 4.5h6v2H9z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 12l1.8 1.8L14 10.5M8.5 17h7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
