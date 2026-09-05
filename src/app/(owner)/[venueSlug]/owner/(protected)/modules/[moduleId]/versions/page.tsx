import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublishVersionForm } from "@/components/owner/PublishVersionForm";

export default async function OwnerModuleVersionsPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase.from("modules").select("id, title, status").eq("id", moduleId).maybeSingle();
  if (!module) notFound();

  // "Applicable" staff for re-acknowledgement mirrors
  // getOutstandingAcknowledgements()'s own definition: whoever has actually
  // COMPLETED this module before, not just whoever matches its assigned
  // role -- a newly hired staff member who hasn't done the module yet isn't
  // "outstanding" on a version, they just see the current content as their
  // first pass. Owners/managers never go through the staff completion flow,
  // so they're excluded by construction (no staff_module_progress row).
  const { data: progress } = await supabase
    .from("staff_module_progress")
    .select("user_id, completed_at, app_users(name)")
    .eq("module_id", moduleId)
    .eq("status", "completed");

  const { data: versions } = await supabase
    .from("module_versions")
    .select("id, version, changelog, published_at")
    .eq("module_id", moduleId)
    .order("version", { ascending: false });

  const { data: acks } = await supabase
    .from("staff_module_acknowledgements")
    .select("user_id, module_version_id")
    .in("module_version_id", (versions ?? []).map((v) => v.id));

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">{module.title} version history</h1>

        {module.status === "live" && <PublishVersionForm moduleId={module.id} />}

        <div className="space-y-4">
          {(versions ?? []).map((v) => {
            // Mirrors getOutstandingAcknowledgements()'s isNewerThanCompletion
            // check exactly (just from the owner's side): only staff who
            // completed the module BEFORE this version was published need to
            // catch up on it. Anyone who completed after already saw this
            // version's content as part of their normal completion -- no
            // separate ack needed, so they're not tracked against it.
            const applicable = (progress ?? []).filter(
              (p) => p.completed_at && v.published_at && p.completed_at < v.published_at,
            );
            const ackedUserIds = new Set(
              (acks ?? []).filter((a) => a.module_version_id === v.id).map((a) => a.user_id),
            );
            const acked = applicable.filter((p) => p.user_id && ackedUserIds.has(p.user_id));
            const notAcked = applicable.filter((p) => p.user_id && !ackedUserIds.has(p.user_id));

            return (
              <div key={v.id} className="rounded-2xl border-2 border-clay-brown/40 px-4 py-4 space-y-2">
                <p className="font-display text-ink">
                  v{v.version}
                  {v.published_at ? ` · ${new Date(v.published_at).toLocaleDateString()}` : ""}
                </p>
                {v.changelog && <p className="font-sans text-sm text-ink">{v.changelog}</p>}
                <p className="font-mono text-xs text-bay-green">
                  Acknowledged ({acked.length}): {acked.map((p) => p.app_users?.name).join(", ") || "None"}
                </p>
                <p className="font-mono text-xs text-preserve-red">
                  Outstanding ({notAcked.length}): {notAcked.map((p) => p.app_users?.name).join(", ") || "None"}
                </p>
              </div>
            );
          })}
          {(versions ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No versions published yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
