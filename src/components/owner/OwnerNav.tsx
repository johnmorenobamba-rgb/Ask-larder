"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const SECTIONS = [
  { href: "staff", label: "Staff" },
  { href: "completions", label: "Completions" },
  { href: "certs", label: "Certificates" },
  { href: "modules", label: "Modules" },
  { href: "escalations", label: "Escalations" },
  { href: "near-misses", label: "Near-misses" },
  { href: "stations", label: "Stations" },
  { href: "photo-library", label: "Photos" },
];

export function OwnerNav({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push(`/${venueSlug}/owner/login`);
  }

  return (
    <nav className="border-b-2 border-clay-brown/20 bg-parchment px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link href={`/${venueSlug}/owner/dashboard`} className="font-display text-lg font-bold text-ink">
          {venueName}
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {SECTIONS.map((s) => {
            const href = `/${venueSlug}/owner/${s.href}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={s.href}
                href={href}
                className={`font-mono text-xs uppercase tracking-wide ${
                  active ? "text-preserve-red" : "text-clay-brown hover:text-ink"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={signOut}
            className="font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
