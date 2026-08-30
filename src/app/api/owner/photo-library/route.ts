import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

const VALID_TAGS = ["station", "module", "general", "hero"];

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.storagePath !== "string" || !body.storagePath || !VALID_TAGS.includes(body?.tag)) {
    return NextResponse.json({ error: "storagePath and a valid tag are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photo_library")
    .insert({
      venue_id: staff.venue_id,
      storage_path: body.storagePath,
      tag: body.tag,
      station_id: typeof body.stationId === "string" ? body.stationId : null,
      module_id: typeof body.moduleId === "string" ? body.moduleId : null,
      uploaded_by: staff.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("photo-library insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
