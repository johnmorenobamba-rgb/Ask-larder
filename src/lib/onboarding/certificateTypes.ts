import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type TypedClient = SupabaseClient<Database>;

/**
 * Find-or-create a venue-scoped certificate_types row by exact name. Used
 * by the RSA, Food Handling, and Food Safety Supervisor pages, which all
 * auto-create their certificate type on first branch selection rather than
 * requiring a separate setup step (Q2 §3, Pages 6a/7a/7b).
 */
export async function findOrCreateCertificateType(supabase: TypedClient, venueId: string, name: string): Promise<string> {
  const { data: existing } = await supabase
    .from("certificate_types")
    .select("id")
    .eq("venue_id", venueId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("certificate_types")
    .insert({ venue_id: venueId, name })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? `Failed to create certificate type "${name}".`);
  return created.id;
}

/** Full-replace the set of roles required to hold a given certificate type. */
export async function replaceCertificateTypeRoles(supabase: TypedClient, certificateTypeId: string, roleIds: string[]) {
  await supabase.from("certificate_type_roles").delete().eq("certificate_type_id", certificateTypeId);
  if (roleIds.length > 0) {
    await supabase
      .from("certificate_type_roles")
      .insert(roleIds.map((roleId) => ({ certificate_type_id: certificateTypeId, role_id: roleId })));
  }
}
