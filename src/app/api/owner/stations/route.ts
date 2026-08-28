import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string" || typeof body?.qrCodeSlug !== "string" || !body.name || !body.qrCodeSlug) {
    return NextResponse.json({ error: "name and qrCodeSlug are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stations")
    .insert({
      venue_id: staff.venue_id,
      name: body.name,
      qr_code_slug: body.qrCodeSlug,
      primary_module_id: typeof body.primaryModuleId === "string" ? body.primaryModuleId : null,
    })
    .select("id")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "That QR code slug is already in use." : "Unexpected error." }, { status });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
