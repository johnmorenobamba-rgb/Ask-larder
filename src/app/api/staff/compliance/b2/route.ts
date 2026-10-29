import { NextResponse } from "next/server";
import { rejectDevice } from "@/lib/auth/device";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth/session";
import { COMPLIANCE_FORMS, canSubmitForm } from "@/lib/compliance/catalog";
import { getStaffDepartment } from "@/lib/compliance/b2Data";
import { READING_MAX_C, READING_MIN_C, cleanNote, readingRangeMessage } from "@/lib/compliance/b2";
import { processAlerts } from "@/lib/compliance/alerts";
import type { Json } from "@/lib/supabase/types";

// POST /api/staff/compliance/b2: save a round of B2 temperature readings.
//
// Trust boundaries:
//   - WHO is writing comes ONLY from the authenticated session (getCurrentStaff).
//     Any staffId, venueId, submittedBy, name, audience, outOfRange or
//     submittedAt in the request body is ignored: this route never reads them.
//   - WHAT the audience is comes from the static catalog, never the client.
//   - Whether a reading is out of range, and every other integrity rule, is
//     decided inside submit_compliance_form (database), which only service_role
//     can call. This route is the only caller.
const MAX_ENTRIES = 60;
const MAX_BODY_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FriendlyError = { status: number; error: string };

// The function's own messages mapped to something a person can act on. Anything
// unrecognised becomes a generic 500 so database wording never leaks to the browser.
function mapRpcError(message: string): FriendlyError {
  const m = message.toLowerCase();
  if (m.includes("corrective action is required")) {
    return { status: 400, error: "Write what you did about it before saving an out of range reading." };
  }
  if (m.includes("only the latest reading")) {
    return {
      status: 409,
      error:
        "Only the latest reading for a unit can be corrected. A newer reading has been saved since, so log a new reading for this unit instead.",
    };
  }
  if (m.includes("already been corrected")) {
    return { status: 409, error: "That reading has already been corrected. Reload the page to see the latest reading." };
  }
  if (m.includes("may not submit")) return { status: 403, error: "Your role can't log this form." };
  if (m.includes("does not belong to this venue")) return { status: 403, error: "Not authorized." };
  if (m.includes("unit not found")) return { status: 409, error: "A unit on this page isn't available any more. Reload the page and try again." };
  if (m.includes("reading_c must be")) {
    return { status: 400, error: readingRangeMessage() };
  }
  if (m.includes("already used for a different reading")) {
    return { status: 409, error: "That save didn't match an earlier one. Reload the page and try again." };
  }
  if (m.includes("only once per submission")) return { status: 400, error: "Each unit can only be logged once in one save." };
  if (m.includes("correction must link") || m.includes("corrects_submission_id")) {
    return { status: 409, error: "That reading can't be corrected. Reload the page and try again." };
  }
  return { status: 500, error: "Couldn't save the readings. Try again." };
}

export async function POST(request: Request) {
  const deniedDevice = await rejectDevice();
  if (deniedDevice) return deniedDevice;

  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const form = COMPLIANCE_FORMS.B2;
  const supabase = await createClient();
  const dept = await getStaffDepartment(supabase, staff.staff_role_id);
  if (!dept.ok) return NextResponse.json({ error: "Couldn't check your role. Try again." }, { status: 500 });
  if (!canSubmitForm(form, { isManagerTier: staff.isManagerTier, department: dept.department })) {
    return NextResponse.json({ error: "Your role can't log this form." }, { status: 403 });
  }

  // cap the request size before parsing (60 readings with notes is well under this)
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "That request is too large." }, { status: 413 });
  const body = await request.json().catch(() => null);
  const rawEntries: unknown[] = Array.isArray(body?.entries) ? body.entries : [];
  if (rawEntries.length === 0 || rawEntries.length > MAX_ENTRIES) {
    return NextResponse.json({ error: "Enter at least one reading." }, { status: 400 });
  }

  const entries: Json[] = [];
  for (const raw of rawEntries) {
    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ error: "A reading in the request was not readable." }, { status: 400 });
    }
    const e = raw as Record<string, unknown>;
    const clientRequestId = typeof e.clientRequestId === "string" ? e.clientRequestId : "";
    const unitId = typeof e.unitId === "string" ? e.unitId : "";
    const readingC = e.readingC;
    if (!UUID_RE.test(clientRequestId) || !UUID_RE.test(unitId)) {
      return NextResponse.json({ error: "A reading in the request was not readable." }, { status: 400 });
    }
    if (typeof readingC !== "number" || !Number.isFinite(readingC) || readingC < READING_MIN_C || readingC > READING_MAX_C) {
      return NextResponse.json({ error: readingRangeMessage() }, { status: 400 });
    }
    const note = typeof e.correctiveAction === "string" ? cleanNote(e.correctiveAction) : "";
    const corrects = typeof e.correctsSubmissionId === "string" && e.correctsSubmissionId ? e.correctsSubmissionId : null;
    if (corrects && !UUID_RE.test(corrects)) {
      return NextResponse.json({ error: "A reading in the request was not readable." }, { status: 400 });
    }
    entries.push({
      client_request_id: clientRequestId,
      unit_id: unitId,
      reading_c: readingC,
      corrective_action: note || null,
      corrects_submission_id: corrects,
    });
  }

  // Device stamp is read from the request headers here, never accepted from the body.
  const deviceStamp = (request.headers.get("user-agent") ?? "unknown").slice(0, 300);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("submit_compliance_form", {
    p_venue_id: staff.venue_id,
    p_staff_id: staff.id,
    p_form_id: "B2",
    p_visible_to_roles: [...form.visibleToRoles],
    p_entries: entries,
    p_device_stamp: deviceStamp,
  });

  if (error) {
    const friendly = mapRpcError(error.message ?? "");
    if (friendly.status >= 500) console.error("[b2] submit_compliance_form failed:", error.message);
    return NextResponse.json({ error: friendly.error }, { status: friendly.status });
  }

  type Saved = { id: string; unit_id: string; unit_name: string; reading_c: number; out_of_range: boolean; inserted: boolean; new_episode: boolean };
  const saved = (Array.isArray(data) ? data : []) as unknown as Saved[];

  // Owner alert: one email per unit per out of range episode. Best effort and gated by
  // COMPLIANCE_ALERT_EMAIL_ENABLED (off unless set); the reading is already stored.
  const episodeIds = saved.filter((s) => s.out_of_range && s.new_episode).map((s) => s.id);
  let alertsSent = 0;
  try {
    const results = await processAlerts(admin, staff.venue_id, episodeIds);
    alertsSent = results.filter((r) => r.outcome === "sent").length;
  } catch (err) {
    console.error("[b2] alert processing failed:", err instanceof Error ? err.message : "unknown error");
  }

  return NextResponse.json({
    ok: true,
    saved: saved.map((s) => ({
      id: s.id,
      unitId: s.unit_id,
      unitName: s.unit_name,
      readingC: s.reading_c,
      outOfRange: s.out_of_range,
      inserted: s.inserted,
    })),
    ownerAlertsSent: alertsSent,
  });
}
