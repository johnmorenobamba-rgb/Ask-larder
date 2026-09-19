import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const update: {
    name?: string;
    primary_module_id?: string | null;
    equipment_manufacturer?: string | null;
    equipment_model?: string | null;
    equipment_serial?: string | null;
    nameplate_photo_id?: string | null;
  } = {};
  if (typeof body?.name === "string") update.name = body.name;
  if (typeof body?.primaryModuleId === "string" || body?.primaryModuleId === null) {
    update.primary_module_id = body.primaryModuleId;
  }
  // Equipment identification -- owner-confirmed values only. This route
  // never receives raw OCR output directly; the analyze step returns
  // suggestions to the client, and only what the owner then submits here
  // (edited or accepted as-is) gets saved.
  if (typeof body?.equipmentManufacturer === "string" || body?.equipmentManufacturer === null) {
    update.equipment_manufacturer = body.equipmentManufacturer || null;
  }
  if (typeof body?.equipmentModel === "string" || body?.equipmentModel === null) {
    update.equipment_model = body.equipmentModel || null;
  }
  if (typeof body?.equipmentSerial === "string" || body?.equipmentSerial === null) {
    update.equipment_serial = body.equipmentSerial || null;
  }
  if (typeof body?.nameplatePhotoId === "string" || body?.nameplatePhotoId === null) {
    update.nameplate_photo_id = body.nameplatePhotoId;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("stations").update(update).eq("id", id).select("id").maybeSingle();

  if (error) {
    console.error("update station unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Station not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("stations").delete().eq("id", id).select("id").maybeSingle();

  if (error) {
    console.error("delete station unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Station not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
