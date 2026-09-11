import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { SopDocumentContent } from "@/lib/ai/generateSopDocument";

export interface SopDocumentViewData {
  venueName: string;
  legalName: string | null;
  address: string | null;
  moduleTitle: string;
  approvedByName: string | null;
  approvedAt: string | null;
  generatedAt: string;
  roleNames: string[];
  content: SopDocumentContent;
}

// Shared by the single SOP view/print page and "Print all" (Block R3) --
// both need the exact same header data assembled the exact same way.
export async function fetchSopDocumentData(
  supabase: SupabaseClient<Database>,
  venueId: string,
  moduleId: string,
): Promise<SopDocumentViewData | null> {
  const [{ data: venue }, { data: licenceProfile }, { data: moduleRow }, { data: sopDoc }, { data: roleLinks }] =
    await Promise.all([
      supabase.from("venues").select("name").eq("id", venueId).maybeSingle(),
      supabase.from("venue_licence_profile").select("legal_name, address").eq("venue_id", venueId).maybeSingle(),
      supabase
        .from("modules")
        .select("title, approved_at, approved_by, app_users:approved_by(name)")
        .eq("id", moduleId)
        .eq("venue_id", venueId)
        .maybeSingle(),
      supabase.from("sop_documents").select("content, generated_at").eq("module_id", moduleId).maybeSingle(),
      supabase.from("module_roles").select("staff_roles(name)").eq("module_id", moduleId),
    ]);

  if (!venue || !moduleRow || !sopDoc) return null;

  const roleNames = (roleLinks ?? [])
    .map((r) => (r.staff_roles as { name: string } | null)?.name)
    .filter((n): n is string => Boolean(n));

  return {
    venueName: venue.name,
    legalName: licenceProfile?.legal_name ?? null,
    address: licenceProfile?.address ?? null,
    moduleTitle: moduleRow.title,
    approvedByName: (moduleRow.app_users as { name: string } | null)?.name ?? null,
    approvedAt: moduleRow.approved_at,
    generatedAt: sopDoc.generated_at,
    roleNames,
    content: sopDoc.content as unknown as SopDocumentContent,
  };
}
