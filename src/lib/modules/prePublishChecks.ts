import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { moduleContentReferencesCredential } from "@/lib/security/detectUnrestrictedCredentialContent";

export type PrePublishCheckResult = { ok: true } | { ok: false; error: string; status: 400 | 500 };

/**
 * The two checks a module must pass before any of its content becomes real,
 * live, staff-visible content -- extracted from approve/route.ts (which
 * checked both) so publish-version/route.ts can share them rather than
 * reimplement or silently skip them.
 *
 * Found during the suggestion assistant build (21 Sep 2026): publish-version
 * -- the path an ALREADY-LIVE module uses to ship a new version -- checked
 * neither of these. The first-time approve() gate caught both; a version
 * update to a module already in front of staff caught neither. This was a
 * real, pre-existing gap this feature would have inherited (suggestions
 * approved against a live module go out exactly this way), not something
 * invented for suggestions specifically -- closing it here protects every
 * future edit to a live module, not just this feature's own.
 */
export async function checkModulePrePublish(supabase: SupabaseClient<Database>, moduleId: string): Promise<PrePublishCheckResult> {
  const { data: pendingSections, error: pendingError } = await supabase
    .from("module_sections")
    .select("id")
    .eq("module_id", moduleId)
    .eq("provenance", "ai_recommended_pending")
    .limit(1);
  if (pendingError) return { ok: false, error: "Unexpected error.", status: 500 };
  if (pendingSections && pendingSections.length > 0) {
    return { ok: false, error: "Confirm all of Larder's suggested content in this module before publishing it.", status: 400 };
  }

  const { data: allSections, error: sectionsError } = await supabase.from("module_sections").select("content").eq("module_id", moduleId);
  if (sectionsError) return { ok: false, error: "Unexpected error.", status: 500 };
  if (moduleContentReferencesCredential(allSections ?? [])) {
    const { count: roleCount, error: roleError } = await supabase
      .from("module_roles")
      .select("id", { count: "exact", head: true })
      .eq("module_id", moduleId);
    if (roleError) return { ok: false, error: "Unexpected error.", status: 500 };
    if (!roleCount || roleCount === 0) {
      return {
        ok: false,
        error:
          "This module looks like it states a real code, combination, PIN, or credential, but it isn't restricted to specific roles yet. Set who can see this module before publishing it.",
        status: 400,
      };
    }
  }

  return { ok: true };
}
