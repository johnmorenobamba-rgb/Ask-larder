import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

const resend = new Resend(process.env.RESEND_API_KEY);

// Block R4 -- the first real mechanism behind the $25/edit pricing line.
//
// FROM_EMAIL deliberately does NOT follow cert-nudge/weekly-digest's
// notifications@larder-updates.example placeholder pattern -- that domain
// is a known dead end (asklarder.com.au isn't yet DNS-verified in the
// shared Resend account, confirmed 6 Sep 2026, same blocker noted in both
// of those files) and using it here would make this feature untestable
// end-to-end, which R5 explicitly requires. rolechamp.com.au is the one
// domain actually verified in the account, so this send uses it for real
// delivery now. Swap to an asklarder.com.au address once that domain is
// verified -- same open item as cert-nudge and weekly-digest.
const FROM_EMAIL = "Larder <sop-requests@rolechamp.com.au>";
const FOUNDER_EMAIL = process.env.FOUNDER_NOTIFICATION_EMAIL;

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "Describe what needs to change." }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: moduleRow, error: moduleError }, { data: venue }] = await Promise.all([
    supabase.from("modules").select("id, title").eq("id", moduleId).eq("venue_id", staff.venue_id).maybeSingle(),
    supabase.from("venues").select("name").eq("id", staff.venue_id).maybeSingle(),
  ]);
  if (moduleError) {
    console.error("request-edit module lookup error:", moduleError.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!moduleRow) {
    return NextResponse.json({ error: "Module not found for this venue." }, { status: 404 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("sop_edit_requests")
    .insert({
      venue_id: staff.venue_id,
      module_id: moduleId,
      requester: staff.id,
      description,
    })
    .select("id, status, created_at")
    .single();
  if (insertError || !inserted) {
    console.error("request-edit insert error:", insertError?.message);
    return NextResponse.json({ error: "Couldn't log the edit request." }, { status: 500 });
  }

  // Best-effort, matching ingestModule/generateSopDocument's convention
  // elsewhere in this codebase: the request is already logged (the durable
  // record a real founder follow-up depends on) before the email is
  // attempted, so a Resend outage never loses the request itself, only the
  // immediate notification -- the request still shows up as 'open' on
  // whatever eventually reads sop_edit_requests.
  if (FOUNDER_EMAIL) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: FOUNDER_EMAIL,
        subject: `SOP edit request: ${venue?.name ?? "A venue"} — ${moduleRow.title}`,
        text: [
          `Venue: ${venue?.name ?? "Unknown"}`,
          `SOP: ${moduleRow.title}`,
          `Requested by: ${staff.name} (${staff.role})`,
          "",
          "What needs to change:",
          description,
          "",
          `Request id: ${inserted.id}`,
        ].join("\n"),
      });
      if (sendError) {
        console.error("request-edit notification send failed:", sendError);
      }
    } catch (err) {
      console.error("request-edit notification send failed:", err);
    }
  } else {
    console.error("request-edit: FOUNDER_NOTIFICATION_EMAIL is not set, skipping notification.");
  }

  return NextResponse.json({ ok: true, id: inserted.id, status: inserted.status });
}
