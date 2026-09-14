import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ModuleStatusActions } from "@/components/owner/ModuleStatusActions";
import { ScrollStackList } from "@/components/shared/ScrollStackList";
import { ModuleContentBlock } from "@/components/staff/ModuleContentBlock";
import { ProvenanceBadge, type Provenance } from "@/components/owner/ProvenanceBadge";
import { logQueryError } from "@/lib/supabase/logQueryError";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  live: "Live",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "border-clay-brown/40",
  pending_approval: "border-saffron",
  approved: "border-bay-green",
  live: "border-bay-green",
};

export default async function OwnerModulesPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const supabase = await createClient();
  const { data: modules, error: modulesError } = await supabase.from("modules").select("id, title, status, version, topic_key").order("title");
  logQueryError(`[${venueSlug}] owner modules list`, modulesError);

  // Content preview for anything awaiting a decision -- an owner approving
  // a module is a real liability/trust gate (per CLAUDE.md's locked
  // approval-gate rule), so the content it covers needs to actually be
  // visible right where the Approve button is, not one click away.
  const pendingIds = (modules ?? []).filter((m) => m.status === "pending_approval").map((m) => m.id);
  const { data: pendingSections, error: pendingSectionsError } =
    pendingIds.length > 0
      ? await supabase
          .from("module_sections")
          .select("id, module_id, section_order, content, provenance, citation")
          .in("module_id", pendingIds)
          .order("section_order")
      : { data: [], error: null };
  logQueryError(`[${venueSlug}] owner modules pendingSections`, pendingSectionsError);
  const sectionsByModule = new Map<
    string,
    { id: string; section_order: number; content: string | null; provenance: string; citation: string | null }[]
  >();
  for (const s of pendingSections ?? []) {
    const list = sectionsByModule.get(s.module_id!) ?? [];
    list.push(s);
    sectionsByModule.set(s.module_id!, list);
  }
  // Manufacturer name for the ai_manual_sourced badge's "from the {X}
  // manual" label -- equipment modules are keyed station_equipment_{slug},
  // joined back to the station that owns that slug for this venue.
  const { data: stations, error: stationsError } = await supabase.from("stations").select("qr_code_slug, equipment_manufacturer");
  logQueryError(`[${venueSlug}] owner modules stations`, stationsError);
  const manufacturerBySlug = new Map((stations ?? []).map((s) => [s.qr_code_slug, s.equipment_manufacturer]));
  function manufacturerForTopic(topicKey: string | null): string | null {
    if (!topicKey?.startsWith("station_equipment_")) return null;
    return manufacturerBySlug.get(topicKey.replace("station_equipment_", "")) ?? null;
  }
  const hasPendingRecommendation = (moduleId: string) =>
    (sectionsByModule.get(moduleId) ?? []).some((s) => s.provenance === "ai_recommended_pending");

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Modules</h1>
        <ScrollStackList className="space-y-3">
          {(modules ?? []).map((m) => (
            <div key={m.id} className={`rounded-2xl border-2 bg-parchment ${STATUS_COLOR[m.status ?? "draft"]} px-4 py-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-ink">{m.title}</p>
                  <p className="font-mono text-xs text-clay-brown">
                    {STATUS_LABEL[m.status ?? "draft"]} · v{m.version}
                  </p>
                </div>
                <ModuleStatusActions
                  moduleId={m.id}
                  status={m.status ?? "draft"}
                  blockedReason={hasPendingRecommendation(m.id) ? "Confirm Larder's suggested content below before approving." : null}
                />
              </div>
              {m.status === "pending_approval" && (
                <div className="mt-4 space-y-4 rounded-2xl border-2 border-clay-brown/20 bg-parchment/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                    What you&apos;re approving
                  </p>
                  {(sectionsByModule.get(m.id) ?? []).map((s) => (
                    <div key={s.id} className="space-y-2">
                      <ModuleContentBlock content={s.content ?? ""} />
                      <ProvenanceBadge
                        provenance={(s.provenance as Provenance) ?? "owner_sourced"}
                        citation={s.citation}
                        manufacturer={manufacturerForTopic(m.topic_key)}
                        confirmUrl={`/api/owner/module-sections/${s.id}/confirm-recommendation`}
                      />
                    </div>
                  ))}
                  {(sectionsByModule.get(m.id) ?? []).length === 0 && (
                    <p className="font-sans text-sm text-clay-brown">No content written yet.</p>
                  )}
                </div>
              )}
              <Link
                href={`/${venueSlug}/owner/sops/${m.id}`}
                className="mt-2 inline-block font-mono text-xs text-clay-brown underline"
              >
                View
              </Link>
              {m.status === "live" && (
                <Link
                  href={`/${venueSlug}/owner/modules/${m.id}/versions`}
                  className="mt-2 ml-3 inline-block font-mono text-xs text-clay-brown underline"
                >
                  Versions
                </Link>
              )}
            </div>
          ))}
          {(modules ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No modules yet.</p>
          )}
        </ScrollStackList>
      </div>
    </main>
  );
}
