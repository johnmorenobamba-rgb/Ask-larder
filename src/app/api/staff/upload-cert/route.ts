import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCertDueDate } from "@/lib/certs/certTracking";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.certificateTypeId || !body?.photoRef || !body?.issuedDate) {
    return NextResponse.json(
      { error: "certificateTypeId, photoRef, and issuedDate are all required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!appUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Scoped to the caller's own row, same reasoning as set-role/complete-module
  // — the underlying RLS policy is venue-wide, not self-scoped, so this
  // can't rely on it alone to stop one staff member overwriting another's
  // certificate record.
  const { data: certType } = await supabase
    .from("certificate_types")
    .select("validity_years")
    .eq("id", body.certificateTypeId)
    .single();
  if (!certType) {
    return NextResponse.json({ error: "Certificate type not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("staff_certificates")
    .select("id")
    .eq("user_id", appUser.id)
    .eq("certificate_type_id", body.certificateTypeId)
    .maybeSingle();

  const record = {
    user_id: appUser.id,
    certificate_type_id: body.certificateTypeId,
    photo_ref: body.photoRef,
    issued_date: body.issuedDate,
    // Computed from the certificate type's own validity period, not trusted
    // from the client -- see certTracking.ts (WWCC 5 years, the other four
    // 3 years, all VIC-specific and flagged there).
    expiry_date: computeCertDueDate(body.issuedDate, certType.validity_years),
  };

  const { error } = existing
    ? await supabase.from("staff_certificates").update(record).eq("id", existing.id)
    : await supabase.from("staff_certificates").insert(record);

  if (error) {
    console.error("upload-cert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
