import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth/session";
import { isEligibleCosigner } from "@/lib/compliance/engine/cosigners";
import { PinAuthError, verifyStaffPin } from "@/lib/auth/staffPin";
import { getStaffDepartment } from "@/lib/compliance/b2Data";
import { cleanNote } from "@/lib/compliance/b2";
import { getGenericForm } from "@/lib/compliance/engine/forms";
import { canFillStage, gateRoles, isFormOn, visibleRoles } from "@/lib/compliance/engine/activation";
import { loadActivationContext, loadActivationRows } from "@/lib/compliance/engine/hubData";
import { compileRules, fieldsFor, findStage } from "@/lib/compliance/engine/rules";
import type { ChecklistItem } from "@/lib/compliance/engine/types";
import type { Json } from "@/lib/supabase/types";

// POST /api/staff/compliance/forms/[formId]: save ONE record of a generic compliance form.
//
// Trust boundaries (same as the B2 route):
//   - WHO is writing comes ONLY from the authenticated session. A staffId, venueId, submittedBy, name,
//     audience, outOfRange, rules or time in the body is ignored: this route never reads them.
//   - WHAT the rules, audience and stage are comes from the static catalog, never the client.
//   - Pass or fail, the corrective note requirement and every integrity rule are decided inside
//     submit_compliance_record (database), which only service_role can call.
//   - A second signature (cosign forms) is verified here with the other person's PIN, with the same
//     lockout as the login page, then passed to the database as an id.
const MAX_BODY_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[A-Za-z0-9_-]{1,80}$/;

function mapRpcError(message: string): { status: number; error: string } {
  const m = message.toLowerCase();
  if (m.includes("corrective action is required")) return { status: 400, error: "Write what you did about it before saving a fail." };
  if (m.includes("switched off")) return { status: 403, error: "This form is switched off for your venue." };
  if (m.includes("may not submit") || m.includes("does not belong to this venue")) return { status: 403, error: "Your role can't log this form." };
  if (m.includes("second person must sign off") || m.includes("second person does not belong")) {
    return { status: 400, error: "A second person must sign off with their PIN." };
  }
  if (m.includes("only the latest record")) {
    return { status: 409, error: "Only the latest record can be corrected. Log a new record instead." };
  }
  if (m.includes("already been corrected") || m.includes("correction must link") || m.includes("does not take corrections")) {
    return { status: 409, error: "That record can't be corrected. Reload the page and try again." };
  }
  if (m.includes("already been logged")) return { status: 409, error: "That step has already been logged. Reload the page." };
  if (m.includes("earlier step")) return { status: 409, error: "An earlier step in this chain is missing. Log it first." };
  if (m.includes("chain")) return { status: 409, error: "That batch or request wasn't found. Reload the page and try again." };
  if (m.includes("already used for a different")) return { status: 409, error: "That save didn't match an earlier one. Reload the page and try again." };
  if (m.includes("at least one check must apply")) return { status: 400, error: "At least one check must apply. Mark something as pass or fail." };
  if (m.includes("every checklist item") || m.includes("unknown checklist item") || m.includes("invalid rules") || m.includes("invalid audience")) {
    return { status: 409, error: "This form changed since you opened it. Reload the page and try again." };
  }
  if (m.includes("is required")) return { status: 400, error: "Fill in every required field." };
  if (m.includes("must be") || m.includes("allowed choices") || m.includes("too long") || m.includes("unknown")) {
    return { status: 400, error: "One of the answers isn't valid. Check each field and try again." };
  }
  return { status: 500, error: "Couldn't save the record. Try again." };
}

function cleanValue(v: unknown): unknown {
  if (typeof v === "string") return cleanNote(v, 500);
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (!KEY_RE.test(k) || typeof x !== "string") return null;
      out[k] = x;
    }
    return out;
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const def = getGenericForm(formId);
  if (!def) return NextResponse.json({ error: "That form doesn't exist." }, { status: 404 });

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "That request is too large." }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "That request was not readable." }, { status: 400 });

  const stage = def.stages ? findStage(def, typeof body.stage === "string" ? body.stage : undefined) : null;
  if (def.stages && !stage) return NextResponse.json({ error: "That step doesn't exist." }, { status: 400 });

  const supabase = await createClient();
  const dept = await getStaffDepartment(supabase, staff.staff_role_id);
  if (!dept.ok) return NextResponse.json({ error: "Couldn't check your role. Try again." }, { status: 500 });
  if (!canFillStage(def, stage, { isManagerTier: staff.isManagerTier, department: dept.department })) {
    return NextResponse.json({ error: "Your role can't log this form." }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ ctx }, { rows }] = await Promise.all([loadActivationContext(supabase, admin, staff.venue_id), loadActivationRows(supabase, staff.venue_id)]);
  if (!isFormOn(def, rows.get(def.id), ctx)) return NextResponse.json({ error: "This form is switched off for your venue." }, { status: 403 });

  const clientRequestId = typeof body.clientRequestId === "string" ? body.clientRequestId : "";
  const chainId = typeof body.chainId === "string" && body.chainId ? body.chainId : null;
  const corrects = typeof body.correctsSubmissionId === "string" && body.correctsSubmissionId ? body.correctsSubmissionId : null;
  if (!UUID_RE.test(clientRequestId) || (chainId && !UUID_RE.test(chainId)) || (corrects && !UUID_RE.test(corrects))) {
    return NextResponse.json({ error: "That request was not readable." }, { status: 400 });
  }
  const rawValues = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? (body.values as Record<string, unknown>) : null;
  if (!rawValues || Object.keys(rawValues).length > 40) return NextResponse.json({ error: "Fill in the form before saving." }, { status: 400 });

  // only keys the catalog defines are passed on; anything else is dropped here and refused by the database
  const fields = fieldsFor(def, stage);
  const allowed = new Set(fields.map((f) => f.key));
  const values: Record<string, Json> = {};
  for (const [k, v] of Object.entries(rawValues)) {
    if (!allowed.has(k)) return NextResponse.json({ error: "One of the answers isn't valid. Check each field and try again." }, { status: 400 });
    const c = cleanValue(v);
    if (c !== null && c !== "") values[k] = c as Json;
  }
  const note = typeof body.correctiveAction === "string" ? cleanNote(body.correctiveAction) : "";

  // kitchen stations become checklist items (resolved here from the venue's own stations)
  const stationItems: Record<string, ChecklistItem[]> = {};
  for (const f of fields) {
    if (f.type === "checklist" && f.fromStations) {
      const { data: stations, error } = await supabase.from("stations").select("id, name").eq("venue_id", staff.venue_id).order("created_at").limit(40);
      if (error) return NextResponse.json({ error: "Couldn't load this venue's stations. Try again." }, { status: 500 });
      stationItems[f.key] = (stations ?? []).map((s) => ({ key: f.fromStations!.prefix + s.id, label: f.fromStations!.stationItemLabel(s.name) }));
    }
  }

  // second signature
  let cosignerId: string | null = null;
  if (def.cosign) {
    const co = body.cosign as { staffId?: unknown; pin?: unknown } | undefined;
    if (!co || typeof co.staffId !== "string" || !UUID_RE.test(co.staffId) || typeof co.pin !== "string") {
      return NextResponse.json({ error: "A second person must sign off with their PIN." }, { status: 400 });
    }
    if (co.staffId === staff.id) return NextResponse.json({ error: "The second signature must come from a different person." }, { status: 400 });
    if (!(await isEligibleCosigner(admin, staff.venue_id, co.staffId))) {
      return NextResponse.json({ error: "The second signature must come from a manager or supervisor of this venue." }, { status: 403 });
    }
    try {
      const verified = await verifyStaffPin({ venueId: staff.venue_id, staffUserId: co.staffId, pin: co.pin });
      cosignerId = verified.id;
    } catch (err) {
      if (err instanceof PinAuthError) {
        return NextResponse.json({ error: err.status === 423 ? "That person is locked out for a while. Ask someone else." : "That PIN didn't match." }, { status: err.status === 423 ? 423 : 401 });
      }
      console.error("[forms] cosign verification failed:", err instanceof Error ? err.message : "unknown error");
      return NextResponse.json({ error: "Couldn't check that PIN. Try again." }, { status: 500 });
    }
  }

  const rules = compileRules(def, { stageKey: stage?.key, stationItems });
  const deviceStamp = (request.headers.get("user-agent") ?? "unknown").slice(0, 300);

  const { data, error } = await admin.rpc("submit_compliance_record", {
    p_venue_id: staff.venue_id,
    p_staff_id: staff.id,
    p_form_id: def.id,
    p_gate_roles: gateRoles(def, stage),
    p_visible_roles: visibleRoles(def),
    p_rules: rules as unknown as Json,
    p_entry: {
      client_request_id: clientRequestId,
      values,
      corrective_action: note || null,
      corrects_submission_id: corrects,
      chain_id: chainId,
    },
    p_device_stamp: deviceStamp,
    ...(cosignerId ? { p_cosigner_id: cosignerId } : {}),
  });

  if (error) {
    const friendly = mapRpcError(error.message ?? "");
    if (friendly.status >= 500) console.error(`[forms ${def.id}] submit_compliance_record failed:`, error.message);
    return NextResponse.json({ error: friendly.error }, { status: friendly.status });
  }

  const r = (data ?? {}) as { id?: string; out_of_range?: boolean; inserted?: boolean; chain_id?: string | null; fail_reasons?: string[] };
  return NextResponse.json({
    ok: true,
    id: r.id,
    failed: !!r.out_of_range,
    inserted: !!r.inserted,
    chainId: r.chain_id ?? null,
    failReasons: r.fail_reasons ?? [],
  });
}
