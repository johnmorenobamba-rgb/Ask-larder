"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LarderMark } from "@/components/shared/LarderMark";
import { OwnerNavDrawer } from "@/components/owner/OwnerNavDrawer";

/**
 * Replaces the old flat wrapped-list OwnerNav, which spanned 4 lines on
 * mobile with 12 section links plus Log out. Same fixed-header +
 * hamburger + slide-in-drawer pattern as staff/StaffHeader.tsx, so an
 * owner switching between the owner dashboard and the staff app (many
 * owners are also working staff) gets one consistent navigation pattern
 * instead of two different ones.
 */
export function OwnerHeader({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const segment = pathname?.split("/")[3] ?? "";

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push(`/${venueSlug}/owner/login`);
  }

  return (
    <>
      <header className="print:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 md:px-6">
        <Link href={`/${venueSlug}/owner/dashboard`} className="flex items-center gap-2">
          <LarderMark size={22} color="var(--color-parchment)" />
          <span className="font-display text-base font-bold text-parchment">{venueName}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-8 w-8 items-center justify-center"
        >
          <HamburgerIcon open={open} />
        </button>
      </header>
      <OwnerNavDrawer
        venueSlug={venueSlug}
        activeSegment={segment}
        open={open}
        onClose={() => setOpen(false)}
        onSignOut={signOut}
      />
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
