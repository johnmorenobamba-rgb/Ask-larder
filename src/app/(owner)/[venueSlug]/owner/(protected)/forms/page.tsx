import Link from "next/link";
import { requireOwnerPageStaff } from "@/lib/auth/ownerPage";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormActivationList, type ActivationItem } from "@/components/owner/FormActivationList";
import { TradingDayControl } from "@/components/owner/TradingDayControl";
import { FORMS } from "@/lib/compliance/engine/forms";
import { activationReason, isFormOn } from "@/lib/compliance/engine/activation";
import { DEFAULT_CUTOFF_HOUR, loadActivationContext, loadActivationRows } from "@/lib/compliance/engine/hubData";
import { CADENCE_HEADINGS, CADENCE_ORDER, FORM_TAG_LABELS } from "@/lib/compliance/engine/types";

export const dynamic = "force-dynamic";

// Owner page: switch each compliance form on or off. Defaults come from what the wizard captured (food
// service, licence type, accommodation, trade waste agreement); an explicit choice here always wins.
export default async function OwnerFormsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await requireOwnerPageStaff(venueSlug);
  const supabase = await createClient();
  const [{ ctx, cutoffHour, degraded }, { rows, degraded: rowsDegraded }] = await Promise.all([
    loadActivationContext(supabase, createAdminClient(), staff!.venue_id!),
    loadActivationRows(supabase, staff!.venue_id!),
  ]);

  const groups = CADENCE_ORDER.map((cadence) => ({
    heading: CADENCE_HEADINGS[cadence],
    items: FORMS.filter((f) => f.cadence === cadence).map<ActivationItem>((f) => ({
      id: f.id,
      title: f.title,
      summary: f.summary,
      cadenceLabel: f.cadenceNote,
      tagLabel: FORM_TAG_LABELS[f.tag],
      tagVerified: f.tagVerified,
      tagNote: f.tagNote,
      defaultList: !!f.defaultList,
      on: isFormOn(f, rows.get(f.id), ctx),
      reason: activationReason(f, rows.get(f.id), ctx),
      audience: [...f.departments].map((d) => (d === "BOH" ? "back of house" : d === "BAR" ? "bar" : "front of house")).join(" and ") + " staff and managers",
    })),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="min-h-screen bg-parchment px-4 py-10 md:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-1">
          <Link href={`/${venueSlug}/owner/compliance`} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink">
            Back to compliance overview
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink">Compliance forms</h1>
          <p className="font-sans text-base text-ink/70">
            Choose which forms your team fills in. Each form starts on or off based on what you told us at setup. Your choice here always wins.
            The temperature log is always on.
          </p>
        </div>
        {(degraded || rowsDegraded) && (
          <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
            Couldn&apos;t load every setting. What you see may be incomplete. Reload the page to try again.
          </p>
        )}
        <TradingDayControl initialHour={cutoffHour ?? DEFAULT_CUTOFF_HOUR} />
        <FormActivationList groups={groups} />
      </div>
    </main>
  );
}
