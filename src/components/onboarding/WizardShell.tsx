import Link from "next/link";
import { WizardStepNav } from "./WizardStepNav";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

/**
 * The wizard's shared shell: a left step rail (desktop) / top rail
 * (mobile) plus a single-column content well for the active step's form.
 * Sits inside the existing (protected) layout, so auth/role/venue-slug are
 * already checked — this only adds the wizard-specific chrome.
 */
export function WizardShell({
  venueSlug,
  venueName,
  currentSlug,
  flags,
  children,
}: {
  venueSlug: string;
  venueName: string;
  currentSlug: string;
  flags: VenueTypeFlags;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-parchment px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:flex-row">
        <aside className="md:w-64 md:flex-shrink-0">
          <div className="mb-4 space-y-1">
            <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Onboarding</p>
            <h1 className="font-display text-2xl font-bold text-ink">{venueName}</h1>
            <Link
              href={`/${venueSlug}/owner/dashboard`}
              className="font-mono text-[10px] uppercase tracking-wide text-clay-brown hover:text-ink"
            >
              Exit to dashboard
            </Link>
          </div>
          <div className="hidden md:block">
            <WizardStepNav venueSlug={venueSlug} currentSlug={currentSlug} flags={flags} />
          </div>
          <div className="md:hidden">
            <details className="rounded-2xl border-2 border-clay-brown/40 px-3 py-2">
              <summary className="cursor-pointer font-sans text-sm text-ink">All steps</summary>
              <div className="mt-2">
                <WizardStepNav venueSlug={venueSlug} currentSlug={currentSlug} flags={flags} />
              </div>
            </details>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
