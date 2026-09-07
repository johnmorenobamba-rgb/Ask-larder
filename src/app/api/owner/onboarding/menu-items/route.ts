import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { MENU_CATEGORIES } from "@/lib/onboarding/constants";

const VALID_CATEGORIES: Set<string> = new Set(MENU_CATEGORIES.map((c) => c.value));

// Q2 Page 8a — menu items. This is the ONE write path into menu_items,
// used both by the manual entry grid and by the parse-menu review flow
// (Q5 owns POST /api/owner/onboarding/parse-menu, which only proposes rows
// — the owner confirms/edits, and this route does the actual write either
// way, per the frozen contract).
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = typeof body?.category === "string" ? body.category : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  // Client (MenuReviewTable.tsx) sends base_allergens (snake_case, matching
  // the menu_items column and MenuUploadStep's ParsedMenuItem shape) -- this
  // previously read the camelCase baseAllergens, which was always
  // undefined, so every allergen checkbox silently never persisted
  // (confirmed live: Q7's grading found every menu_items row for a real
  // venue had base_allergens = [] despite the onboarding transcript
  // recording allergens being entered, including for a plain nuts product).
  const baseAllergens = Array.isArray(body?.base_allergens)
    ? body.base_allergens.filter((a: unknown) => typeof a === "string")
    : [];

  if (!name) {
    return NextResponse.json({ error: "Item name is required." }, { status: 400 });
  }
  if (category && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Category must be food or drink." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      venue_id: staff.venue_id,
      name,
      category: category || null,
      description: description || null,
      base_allergens: baseAllergens,
    })
    .select("id")
    .single();

  if (error) {
    console.error("menu-items insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "menu" });
  return NextResponse.json({ ok: true, id: data.id, flags });
}

export async function DELETE(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("menu_items").delete().eq("id", id).eq("venue_id", staff.venue_id);
  return NextResponse.json({ ok: true });
}
