"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WIZARD_STEPS, isStepApplicable, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";

/**
 * Q2 §1: current_step is a resume hint only — never a gate. Every step
 * stays a real link here regardless of branch flags; a step the venue's
 * answers so far make irrelevant (e.g. Licence detail on an unlicensed
 * venue) is shown muted with a small note rather than removed, since the
 * owner can still open and edit it deliberately.
 */
export function WizardStepNav({
  venueSlug,
  currentSlug,
  flags,
}: {
  venueSlug: string;
  currentSlug: string;
  flags: VenueTypeFlags;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Onboarding steps" className="space-y-1">
      {WIZARD_STEPS.map((step, i) => {
        const href = stepHref(venueSlug, step.slug);
        const active = pathname === href || step.slug === currentSlug;
        const applicable = isStepApplicable(step.slug, flags);
        return (
          <Link
            key={step.slug}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 font-sans text-sm transition-colors ${
              active
                ? "bg-preserve-red text-parchment"
                : applicable
                  ? "text-ink hover:bg-clay-brown/10"
                  : "text-clay-brown/60 hover:bg-clay-brown/10"
            }`}
          >
            <span className={`font-mono text-[10px] ${active ? "text-parchment/80" : "text-clay-brown"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1">{step.label}</span>
            {!applicable && <span className="font-mono text-[10px] italic">not needed</span>}
          </Link>
        );
      })}
    </nav>
  );
}
