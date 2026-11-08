"use client";

import { usePathname } from "next/navigation";
import { ChitMark } from "@/components/shared/ChitMark";

// Route loading state for the staff app and the owner dashboard (performance plan, Phase 3). Replaces the full screen
// LoadingOverlay in the (protected) loading.tsx files: it fills only the content area, so the fixed header and the nav
// drawer stay visible and usable while the next screen loads.
//
// Its shape follows the destination (on a client navigation the URL has already changed when this shows): the staff
// home and the owner dashboard get their tile grid, every other screen a heading and list rows, at the same widths and
// paddings as the real pages, so the swap to real content moves as little as possible.
//
// Motion: one sheen sweeping down the blocks in a short cascade (.skeleton-block, globals.css). The whole skeleton
// fades in only after 150ms (.animate-skeleton-in), so a fast or prefetched navigation never flashes it. Reduced
// motion: static blocks. Not a trust moment, so never the Stamp, a checkmark or confetti.

type Area = "staff" | "owner";

function Block({ className = "", step = 0, dark = false }: { className?: string; step?: number; dark?: boolean }) {
  return (
    <div
      aria-hidden
      className={`skeleton-block rounded-2xl ${dark ? "skeleton-block-dark bg-ink" : "bg-clay-brown/10"} ${className}`}
      style={{ ["--skeleton-step" as string]: step }}
    />
  );
}

function Heading({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <ChitMark size={28} fillColor="var(--color-clay-brown)" traceColor="var(--color-saffron)" />
      <Block className={`h-8 rounded-lg ${wide ? "w-56" : "w-44"}`} />
    </div>
  );
}

function ListRows({ count, step = 1 }: { count: number; step?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-clay-brown/15 px-4 py-4">
          <Block className="h-6 w-6 shrink-0 rounded-full" step={step + i} />
          <Block className={`h-4 rounded-md ${["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3"][i % 5]}`} step={step + i} />
        </div>
      ))}
    </div>
  );
}

function StaffHome() {
  // Mirrors BentoGrid: max-w-3xl, four columns, the Ink greeting band first.
  return (
    <main className="min-h-screen bg-parchment px-4 pb-10 pt-24 md:px-6">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-4">
        <Block dark className="col-span-4 h-36" />
        <Block className="col-span-4 h-40 sm:col-span-2" step={1} />
        <Block className="col-span-4 h-40 sm:col-span-2" step={1} />
        {[2, 2, 3, 3].map((s, i) => (
          <Block key={i} className="col-span-2 h-28 sm:col-span-1" step={s} />
        ))}
      </div>
    </main>
  );
}

function StaffList() {
  // Mirrors the staff list screens (modules, certificates, forms): max-w-lg, heading, rows.
  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <Heading />
        <ListRows count={5} />
      </div>
    </main>
  );
}

function OwnerDashboard() {
  // Mirrors OwnerDashboardBoard: max-w-5xl, a wide needs attention cell, then tiles.
  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Heading />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Block className="h-40 md:col-span-2" step={1} />
          <Block className="h-40" step={1} />
          <Block className="h-32" step={2} />
          <Block className="h-32" step={2} />
          <Block className="h-32" step={2} />
          <Block className="h-44 md:col-span-3" step={3} />
        </div>
      </div>
    </main>
  );
}

function OwnerList() {
  // Mirrors the owner list and detail screens: max-w-4xl, heading, a line of intro, rows.
  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-3">
          <Heading wide />
          <Block className="h-4 w-2/3 rounded-md" />
        </div>
        <ListRows count={6} />
      </div>
    </main>
  );
}

export function ContentSkeleton({ area }: { area: Area }) {
  const pathname = usePathname() ?? "";
  const parts = pathname.split("/").filter(Boolean);
  // staff: /{venue}/{segment}; owner: /{venue}/owner/{segment}
  const segment = area === "owner" ? parts[2] : parts[1];

  const body =
    area === "staff" ? segment === "home" ? <StaffHome /> : <StaffList /> : segment === "dashboard" ? <OwnerDashboard /> : <OwnerList />;

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="animate-skeleton-in">
      <span className="sr-only">Loading</span>
      {body}
    </div>
  );
}
