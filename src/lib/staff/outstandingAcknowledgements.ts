import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OutstandingAcknowledgement = {
  moduleId: string;
  moduleTitle: string;
  moduleVersionId: string;
  changelog: string | null;
};

/**
 * A module version is "outstanding" for a staff member when: they've
 * completed the module, a newer version was published after that
 * completion, and they haven't acknowledged that specific version yet.
 * Modules with no module_versions rows never appear here — there's nothing
 * to re-acknowledge if the content has never been versioned since it was
 * built, and a version published before their original completion was
 * already current when they signed off, so it doesn't require a separate ack.
 */
export async function getOutstandingAcknowledgements(
  staffId: string,
): Promise<OutstandingAcknowledgement[]> {
  const supabase = await createClient();

  const { data: progress } = await supabase
    .from("staff_module_progress")
    .select("module_id, completed_at")
    .eq("user_id", staffId)
    .eq("status", "completed");

  const completedModuleIds = (progress ?? [])
    .filter((p) => p.module_id)
    .map((p) => p.module_id as string);
  if (completedModuleIds.length === 0) return [];

  const { data: versions } = await supabase
    .from("module_versions")
    .select("id, module_id, published_at, changelog, modules(title)")
    .in("module_id", completedModuleIds);

  const latestByModule = new Map<
    string,
    { id: string; published_at: string | null; changelog: string | null; title: string }
  >();
  for (const v of versions ?? []) {
    if (!v.module_id) continue;
    const existing = latestByModule.get(v.module_id);
    if (!existing || (v.published_at ?? "") > (existing.published_at ?? "")) {
      latestByModule.set(v.module_id, {
        id: v.id,
        published_at: v.published_at,
        changelog: v.changelog,
        title: (v.modules as { title: string } | null)?.title ?? "",
      });
    }
  }
  if (latestByModule.size === 0) return [];

  const latestVersionIds = Array.from(latestByModule.values()).map((v) => v.id);
  const { data: acks } = await supabase
    .from("staff_module_acknowledgements")
    .select("module_version_id")
    .eq("user_id", staffId)
    .in("module_version_id", latestVersionIds);

  const acknowledgedVersionIds = new Set((acks ?? []).map((a) => a.module_version_id));
  const completedAtByModule = new Map(
    (progress ?? []).map((p) => [p.module_id, p.completed_at]),
  );

  const outstanding: OutstandingAcknowledgement[] = [];
  for (const [moduleId, latest] of latestByModule) {
    const completedAt = completedAtByModule.get(moduleId);
    const isNewerThanCompletion =
      !completedAt || (latest.published_at ?? "") > completedAt;
    if (isNewerThanCompletion && !acknowledgedVersionIds.has(latest.id)) {
      outstanding.push({
        moduleId,
        moduleTitle: latest.title,
        moduleVersionId: latest.id,
        changelog: latest.changelog,
      });
    }
  }

  return outstanding;
}
