import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { findOrCreateCertificateType, replaceCertificateTypeRoles } from "@/lib/onboarding/certificateTypes";
import { FOOD_SERVICE_LEVELS } from "@/lib/onboarding/constants";

const VALID_LEVELS: Set<string> = new Set(FOOD_SERVICE_LEVELS.map((l) => l.value));

// Q2 Pages 7+7a+7b — food service level, Food Safety Supervisor identity,
// and Food Handling-required roles, combined per FoodServiceGateForm's
// brief. Per the cafe pass's correction (Q1 catalog row 37) this is a risk
// CLASS trigger, not a kitchen-size trigger — "full kitchen" is the one
// option that reliably lands in Class 1/2; "bar snacks or packaged, low
// risk" is named low risk deliberately and does not trigger the FSS branch.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const level = typeof body?.level === "string" ? body.level : "";
  const fssName = typeof body?.fssName === "string" ? body.fssName.trim() : "";
  const fssPhone = typeof body?.fssPhone === "string" ? body.fssPhone.trim() : "";
  const fssEmail = typeof body?.fssEmail === "string" ? body.fssEmail.trim() : "";
  const foodHandlingRoleIds = Array.isArray(body?.foodHandlingRoleIds)
    ? body.foodHandlingRoleIds.filter((r: unknown) => typeof r === "string")
    : [];

  if (!VALID_LEVELS.has(level)) {
    return NextResponse.json({ error: "Choose a food service level." }, { status: 400 });
  }

  const triggered = level === "full_kitchen";
  if (triggered && !fssName) {
    return NextResponse.json({ error: "The Food Safety Supervisor's name is required for this risk level." }, { status: 400 });
  }
  if (triggered && foodHandlingRoleIds.length === 0) {
    return NextResponse.json({ error: "Select at least one role that requires Food Handling certification." }, { status: 400 });
  }

  const supabase = await createClient();

  if (triggered) {
    await findOrCreateCertificateType(supabase, staff.venue_id, "Food Safety Supervisor");
    const foodHandlingTypeId = await findOrCreateCertificateType(supabase, staff.venue_id, "Food Handling");
    await replaceCertificateTypeRoles(supabase, foodHandlingTypeId, foodHandlingRoleIds);

    const { data: existingFss } = await supabase
      .from("venue_key_roles")
      .select("id")
      .eq("venue_id", staff.venue_id)
      .eq("role_type", "food_safety_supervisor")
      .maybeSingle();

    if (existingFss) {
      await supabase
        .from("venue_key_roles")
        .update({ name: fssName, phone: fssPhone || null, email: fssEmail || null })
        .eq("id", existingFss.id);
    } else {
      await supabase.from("venue_key_roles").insert({
        venue_id: staff.venue_id,
        role_type: "food_safety_supervisor",
        name: fssName,
        phone: fssPhone || null,
        email: fssEmail || null,
      });
    }
  } else {
    await supabase.from("venue_key_roles").delete().eq("venue_id", staff.venue_id).eq("role_type", "food_safety_supervisor");
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "food-service",
    flags: { food_service_level: level as "full_kitchen" | "bar_snacks_low_risk" | "no_food_service" },
  });

  return NextResponse.json({ ok: true, flags });
}
