import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Q2 Page 8b — modifier groups + modifiers, nested under a menu item, only
// for items with swap options. Not one of the 14 named "Routes YOU build"
// in the Block Q brief, but required to give Q1 catalog rows 33/34 a real
// write path — the menu item itself has no other place to attach modifier
// data. Ownership of the parent menu_item is checked via a join so a venue
// can't attach modifiers to another venue's item (RLS would already stop
// the write, this just gives a clean 404 instead of a confusing 500).
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const menuItemId = typeof body?.menuItemId === "string" ? body.menuItemId : "";
  const groupName = typeof body?.groupName === "string" ? body.groupName.trim() : "";
  const modifierName = typeof body?.modifierName === "string" ? body.modifierName.trim() : "";
  const allergensAdded = Array.isArray(body?.allergensAdded) ? body.allergensAdded.filter((a: unknown) => typeof a === "string") : [];
  const allergensRemoved = Array.isArray(body?.allergensRemoved) ? body.allergensRemoved.filter((a: unknown) => typeof a === "string") : [];

  if (!menuItemId || !groupName || !modifierName) {
    return NextResponse.json({ error: "menuItemId, groupName, and modifierName are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: item } = await supabase.from("menu_items").select("id").eq("id", menuItemId).eq("venue_id", staff.venue_id).maybeSingle();
  if (!item) {
    return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
  }

  let { data: group } = await supabase
    .from("menu_item_modifier_groups")
    .select("id")
    .eq("menu_item_id", menuItemId)
    .eq("name", groupName)
    .maybeSingle();

  if (!group) {
    const { data: created, error: groupError } = await supabase
      .from("menu_item_modifier_groups")
      .insert({ menu_item_id: menuItemId, name: groupName })
      .select("id")
      .single();
    if (groupError || !created) {
      console.error("menu-item-modifiers group insert unexpected error:", groupError);
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    }
    group = created;
  }

  const { error: modifierError } = await supabase.from("menu_item_modifiers").insert({
    modifier_group_id: group.id,
    name: modifierName,
    allergens_added: allergensAdded,
    allergens_removed: allergensRemoved,
  });

  if (modifierError) {
    console.error("menu-item-modifiers insert unexpected error:", modifierError);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
