import "server-only";
import { createClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/logQueryError";

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
 *
 * One round trip: the rule lives in the security invoker SQL function
 * public.outstanding_acknowledgements (migration 20261109000000), which runs
 * under the caller's RLS exactly like the three queries it replaced.
 */
export async function getOutstandingAcknowledgements(
  staffId: string,
): Promise<OutstandingAcknowledgement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("outstanding_acknowledgements", { p_user_id: staffId });
  logQueryError("outstanding acknowledgements", error);
  return (data ?? []).map((r) => ({
    moduleId: r.module_id,
    moduleTitle: r.module_title,
    moduleVersionId: r.module_version_id,
    changelog: r.changelog,
  }));
}
