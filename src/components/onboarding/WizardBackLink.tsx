import Link from "next/link";
import { stepHref, type WizardStepSlug } from "@/lib/onboarding/steps";

/**
 * A real, visible back affordance on the page itself -- distinct from the
 * sidebar step nav (WizardStepNav), which lets you jump anywhere but isn't
 * a "go back one step" control. Fix round, 11 Sep 2026: nothing on any
 * wizard page provided this before.
 *
 * No client-side state to preserve on navigation: every guaranteed field
 * already writes directly to its real table on submit (Q2 §1), so the
 * previous page always re-reads real persisted data server-side regardless
 * of how you arrive at it. This link doesn't need to carry anything.
 */
export function WizardBackLink({ venueSlug, previousStep }: { venueSlug: string; previousStep: WizardStepSlug | null }) {
  if (!previousStep) return null;
  return (
    <Link
      href={stepHref(venueSlug, previousStep)}
      className="mb-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink"
    >
      ← Back
    </Link>
  );
}
