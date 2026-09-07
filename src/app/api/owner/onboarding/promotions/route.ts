import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { DAYS_OF_WEEK } from "@/lib/onboarding/constants";

const VALID_DAYS: Set<string> = new Set(DAYS_OF_WEEK.map((d) => d.value));

// Q2 Page 9 — happy hour / promotional pricing. Licensed-only, and only
// written when the venue confirms it runs one; never asked at all on the
// no-licence path (enforced upstream by the wizard's own routing, not by
// this route). POST adds one row per call — used as an "add another"
// repeatable-group form, not a full-replace upsert.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const dayOfWeek = typeof body?.dayOfWeek === "string" ? body.dayOfWeek : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime : "";
  const endTime = typeof body?.endTime === "string" ? body.endTime : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!VALID_DAYS.has(dayOfWeek)) {
    return NextResponse.json({ error: "Choose a day of the week." }, { status: 400 });
  }
  if (!startTime || !endTime || startTime >= endTime) {
    return NextResponse.json({ error: "Start time must be before end time." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("venue_promotions").insert({
    venue_id: staff.venue_id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    description: description || null,
  });

  if (error) {
    console.error("promotions insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "promotions",
    flags: { runs_happy_hour: true },
  });

  return NextResponse.json({ ok: true, flags });
}

export async function DELETE(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("venue_promotions").delete().eq("id", id).eq("venue_id", staff.venue_id);
  return NextResponse.json({ ok: true });
}
