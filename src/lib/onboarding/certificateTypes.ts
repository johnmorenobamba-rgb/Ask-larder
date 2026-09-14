import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { CERT_KIND_CONFIG, type CertKind } from "@/lib/certs/certTracking";

type TypedClient = SupabaseClient<Database>;

/**
 * Find-or-create a venue-scoped certificate_types row by exact name. Used
 * by the RSA, Food Handling, and Food Safety Supervisor pages, which all
 * auto-create their certificate type on first branch selection rather than
 * requiring a separate setup step (Q2 §3, Pages 6a/7a/7b).
 *
 * certKind is required so tracking_type/validity_years get set explicitly
 * at creation time (see certTracking.ts) rather than inferred from the
 * display name later -- names alone aren't reliable across states (e.g. a
 * Queensland venue's WWCC is called "Blue Card", not "WWCC").
 */
export async function findOrCreateCertificateType(
  supabase: TypedClient,
  venueId: string,
  name: string,
  certKind: Exclude<CertKind, "other">,
): Promise<string> {
  const { data: existing } = await supabase
    .from("certificate_types")
    .select("id")
    .eq("venue_id", venueId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { trackingType, validityYears } = CERT_KIND_CONFIG[certKind];
  const { data: created, error } = await supabase
    .from("certificate_types")
    .insert({ venue_id: venueId, name, cert_kind: certKind, tracking_type: trackingType, validity_years: validityYears })
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
