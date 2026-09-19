import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { renderBrandedEmailHtml, escapeHtml } from "@/lib/email/brandedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// Block R4 -- the first real mechanism behind the pricing schedule's 5
// free content edits per venue per month, $15 AUD each beyond that (see
// scripts/client-documents/buildPricingSchedule.mjs). Which bucket a given
// request falls into is computed once here, at insert time, and stored on
// the row (`billable`) rather than derived later -- see the migration
// comment on sop_edit_requests.billable for why.
//
// asklarder.com.au is now verified and DNS-wired in the shared Resend
// account (confirmed live 14 Sep 2026) -- swapped off the rolechamp.com.au
// stopgap now that the real domain works.
const FROM_EMAIL = "Larder <hello@asklarder.com.au>";
const FOUNDER_EMAIL = process.env.FOUNDER_NOTIFICATION_EMAIL;

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
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

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count: requestsThisMonth, error: countError } = await supabase
    .from("sop_edit_requests")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", staff.venue_id)
    .gte("created_at", monthStart);
  if (countError) {
    console.error("request-edit month-count error:", countError.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const editNumberThisMonth = (requestsThisMonth ?? 0) + 1;
  const FREE_EDITS_PER_MONTH = 5;
  const billable = editNumberThisMonth > FREE_EDITS_PER_MONTH;

  const { data: inserted, error: insertError } = await supabase
    .from("sop_edit_requests")
    .insert({
      venue_id: staff.venue_id,
      module_id: moduleId,
      requester: staff.id,
      description,
      billable,
    })
    .select("id, status, created_at, billable")
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
        subject: `SOP edit request${billable ? " (billable)" : ""}: ${venue?.name ?? "A venue"}, ${moduleRow.title}`,
        text: [
          `Venue: ${venue?.name ?? "Unknown"}`,
          `SOP: ${moduleRow.title}`,
          `Requested by: ${staff.name} (${staff.role})`,
          `Edit #${editNumberThisMonth} this month for this venue, ${billable ? "billable, $15 AUD" : `free, ${FREE_EDITS_PER_MONTH - editNumberThisMonth} free remaining this month`}.`,
          "",
          "What needs to change:",
          description,
          "",
          `Request id: ${inserted.id}`,
        ].join("\n"),
        html: renderBrandedEmailHtml({
          heading: "SOP edit request",
          bodyHtml: `
            <p style="margin:0 0 4px 0;"><strong>Venue:</strong> ${escapeHtml(venue?.name ?? "Unknown")}</p>
            <p style="margin:0 0 4px 0;"><strong>SOP:</strong> ${escapeHtml(moduleRow.title)}</p>
            <p style="margin:0 0 4px 0;"><strong>Requested by:</strong> ${escapeHtml(staff.name)} (${escapeHtml(staff.role)})</p>
            <p style="margin:0 0 16px 0;"><strong>Edit #${editNumberThisMonth} this month, ${billable ? "billable ($15 AUD)" : `free (${FREE_EDITS_PER_MONTH - editNumberThisMonth} free remaining)`}</strong></p>
            <p style="margin:0 0 4px 0;font-weight:bold;">What needs to change:</p>
            <p style="margin:0 0 16px 0;white-space:pre-wrap;">${escapeHtml(description)}</p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#7A5C43;">Request id: ${escapeHtml(inserted.id)}</p>
          `,
        }),
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

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    status: inserted.status,
    billable,
    editNumberThisMonth,
    freeEditsRemaining: Math.max(0, FREE_EDITS_PER_MONTH - editNumberThisMonth),
  });
}
