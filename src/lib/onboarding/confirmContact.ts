import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Block T5 -- a Type-3 (troubleshoot-then-escalate) answer that names a real
// external contact is only ever a candidate (sop_intake_answers.
// extracted_contact) until the specialist explicitly confirms it here.
// Never called automatically from curateTopic() itself.
export async function confirmExtractedContact(
  supabase: SupabaseClient<Database>,
  venueId: string,
  topicKey: string,
  contactType: string,
): Promise<{ contactId: string } | null> {
  const { data: row, error } = await supabase
    .from("sop_intake_answers")
    .select("extracted_contact")
    .eq("venue_id", venueId)
    .eq("topic_key", topicKey)
    .eq("question_key", "troubleshoot_then_escalate")
    .maybeSingle();
  if (error) throw new Error(error.message);

  const candidate = row?.extracted_contact as { name?: string; phone?: string | null; role?: string | null } | null;
  if (!candidate?.name) return null;

  const { data: created, error: insertError } = await supabase
    .from("venue_contacts")
    .insert({
      venue_id: venueId,
      contact_type: contactType,
      name: candidate.name,
      phone: candidate.phone ?? null,
      notes: candidate.role ? `${candidate.role} -- captured from SOP intake for ${topicKey}` : `Captured from SOP intake for ${topicKey}`,
    })
    .select("id")
    .single();
  if (insertError || !created) throw new Error(insertError?.message ?? "Couldn't save this contact.");

  return { contactId: created.id };
}
