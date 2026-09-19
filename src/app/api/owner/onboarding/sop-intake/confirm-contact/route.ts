import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { confirmExtractedContact } from "@/lib/onboarding/confirmContact";

// Block T5 -- explicit save of a Type-3 extracted contact into
// venue_contacts. Never automatic; the specialist taps "Save this contact"
// after curate returns an extractedContact candidate.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const topicKey = typeof body?.topicKey === "string" ? body.topicKey : "";
  const contactType = typeof body?.contactType === "string" ? body.contactType : "equipment_service";
  if (!topicKey) {
    return NextResponse.json({ error: "topicKey is required." }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = await confirmExtractedContact(supabase, staff.venue_id, topicKey, contactType);
    if (!result) {
      return NextResponse.json({ error: "No extracted contact found to save." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("sop-intake confirm-contact unexpected error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't save this contact." }, { status: 500 });
  }
}
