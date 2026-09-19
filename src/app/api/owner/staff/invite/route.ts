import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { renderBrandedEmailHtml, escapeHtml } from "@/lib/email/brandedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);
// asklarder.com.au is now verified and DNS-wired in the shared Resend
// account (confirmed live 14 Sep 2026) -- swapped off the rolechamp.com.au
// stopgap now that the real domain works.
const FROM_EMAIL = "Larder <hello@asklarder.com.au>";

// Block U1 -- the live, owner-dashboard version of staff-invite. Same
// app_users insert shape as the onboarding wizard's staff-invite/route.ts
// (no auth_id/pin_hash yet -- those are set the first time the person logs
// in and sets their own PIN), but this one is a standing dashboard action,
// not onboarding-scoped, and actually sends a notification email -- the
// onboarding version never did.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Enter at least an email or a phone number." }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: created, error }, { data: venue }] = await Promise.all([
    supabase
      .from("app_users")
      .insert({ venue_id: staff.venue_id, role: "staff", name, email: email || null, phone: phone || null })
      .select("id")
      .single(),
    supabase.from("venues").select("name").eq("id", staff.venue_id).maybeSingle(),
  ]);

  if (error || !created) {
    console.error("staff invite insert unexpected error:", error?.message);
    return NextResponse.json({ error: "Couldn't add this staff member." }, { status: 500 });
  }

  // Best-effort, matching request-edit/route.ts's convention: the staff
  // record already exists (the durable thing this action needs to do)
  // before the email is attempted, so a Resend outage never blocks adding
  // someone to the roster.
  if (email) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `You've been added to ${venue?.name ?? "your venue"} on Larder`,
        text: [
          `Hi ${name},`,
          "",
          `You've been added as staff at ${venue?.name ?? "your venue"} on Larder.`,
          "",
          `Ask your manager for the venue's staff login link, then select your name from the list to set your own PIN.`,
        ].join("\n"),
        html: renderBrandedEmailHtml({
          heading: `You've been added to ${venue?.name ?? "your venue"}`,
          bodyHtml: `
            <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
            <p style="margin:0 0 16px 0;">You've been added as staff at ${escapeHtml(venue?.name ?? "your venue")} on Larder.</p>
            <p style="margin:0;">Ask your manager for the venue's staff login link, then select your name from the list to set your own PIN.</p>
          `,
        }),
      });
      if (sendError) console.error("staff invite notification send failed:", sendError);
    } catch (err) {
      console.error("staff invite notification send failed:", err);
    }
  }

  return NextResponse.json({ ok: true, id: created.id });
}
