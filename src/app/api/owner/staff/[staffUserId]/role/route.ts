import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Change an existing person's job role (hardening-2 task 4). Rules, enforced here with plain messages and again by the
// database guards (migration 20261005060000), so a direct API call cannot get around them:
//   - the owner and a manager can change roles; nobody changes their own role;
//   - only the owner may assign or remove an Authorized tier role; a manager only moves people between Frontline roles;
//   - the person must be an active member of this venue and must not be an owner; the new role must belong to this venue.
// The change itself is written with the signed in session (not the service role), and a database trigger records it in
// staff_role_changes.
export async function POST(request: Request, { params }: { params: Promise<{ staffUserId: string }> }) {
  const { staffUserId } = await params;
  const staff = await getCurrentStaff();
  // The owner and an app role manager (the people the database lets edit other staff rows), not every Authorized tier staff member.
  if (!staff || !staff.venue_id || (staff.role !== "owner" && staff.role !== "manager")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";
  if (!roleId) {
    return NextResponse.json({ error: "Choose a role." }, { status: 400 });
  }
  if (staffUserId === staff.id) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 403 });
  }

  const supabase = await createClient();
  const [{ data: target }, { data: newRole }] = await Promise.all([
    supabase
      .from("app_users")
      .select("id, role, staff_role_id, deactivated_at, staff_roles(fallback_tier)")
      .eq("id", staffUserId)
      .eq("venue_id", staff.venue_id)
      .maybeSingle(),
    supabase.from("staff_roles").select("id, name, fallback_tier").eq("id", roleId).eq("venue_id", staff.venue_id).maybeSingle(),
  ]);
  if (!target || target.deactivated_at) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }
  if (!newRole) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "An owner's access can't be changed here." }, { status: 403 });
  }
  if (target.staff_role_id === newRole.id) {
    return NextResponse.json({ ok: true, unchanged: true, roleName: newRole.name });
  }

  const isOwner = staff.role === "owner";
  const oldTier = target.staff_roles?.fallback_tier ?? "frontline";
  const newTier = newRole.fallback_tier ?? "frontline";
  if (!isOwner && (oldTier !== "frontline" || newTier !== "frontline")) {
    return NextResponse.json({ error: "Only the owner can assign or remove an Authorized role." }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("app_users")
    .update({ staff_role_id: newRole.id })
    .eq("id", target.id)
    .eq("venue_id", staff.venue_id)
    .select("id")
    .maybeSingle();
  if (error) {
    // the database guards use plain sentences; anything they refuse is a permission problem, not a server fault
    if (/Only the owner|cannot change your own|Not allowed|belongs to another venue|Only a manager/i.test(error.message)) {
      return NextResponse.json({ error: "You can't make that change." }, { status: 403 });
    }
    console.error("role change unexpected error:", error.message);
    return NextResponse.json({ error: "Couldn't change this role. Try again." }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, roleName: newRole.name });
}
