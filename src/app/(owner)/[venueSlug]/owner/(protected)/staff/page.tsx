import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { StaffRoleSelect, type RoleOption } from "@/components/owner/StaffRoleSelect";
import { StaffLifecycleActions } from "@/components/owner/StaffLifecycleActions";
import { ReactivateStaffButton } from "@/components/owner/ReactivateStaffButton";
import { isProtectedTarget } from "@/lib/auth/authorizedHolder";
import { InviteStaffForm } from "@/components/owner/InviteStaffForm";
import { StaffCompletionList, type StaffCompletionRow } from "@/components/owner/StaffCompletionList";

// Block K3 — this is now also the "Staff completion" detail screen the
// home dashboard's summary cell links to: J6's original per-staff
// ElevatedCell ring list (extracted into StaffCompletionList.tsx) sits
// above the existing roster/PIN-reset rows, rather than living as a
// separate third staff-related page.
//
// Block U1 — gained a real "Invite staff" action, PIN reset that clears
// rather than sets, and deactivate/reactivate. The active roster and
// completion tiles are filtered to `deactivated_at is null` (this is what
// "removes them from active completion counts" means); a deactivated
// staff member's historical record still shows in full on
// completions/page.tsx, which deliberately has no such filter.
export default async function OwnerStaffPage() {
  const supabase = await createClient();
  const viewer = await getCurrentStaff();

  // app_users_select_own_venue (reconcile_schema_drift) scopes this to the
  // caller's own venue already -- no explicit venue_id filter needed.
  const [{ data: staff }, { data: deactivatedStaff }, { data: liveModules }, { data: progress }, { data: roleRows }] = await Promise.all([
    supabase
      .from("app_users")
      .select("id, name, role, staff_role_id, staff_roles(name, department, fallback_tier)")
      .neq("role", "owner")
      .is("deactivated_at", null)
      .order("name"),
    supabase
      .from("app_users")
      .select("id, name, role, staff_roles(fallback_tier)")
      .neq("role", "owner")
      .not("deactivated_at", "is", null)
      .order("name"),
    supabase.from("modules").select("id").eq("status", "live"),
    supabase.from("staff_module_progress").select("user_id, module_id, status"),
    supabase.from("staff_roles").select("id, name, department, fallback_tier").order("name"),
  ]);
  const roleOptions: RoleOption[] = (roleRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    department: r.department,
    tier: r.fallback_tier === "authorized" ? "authorized" : "frontline",
  }));

  const liveModuleCount = (liveModules ?? []).length;
  // Counts distinct completed module_ids per user, not raw rows -- a real
  // DB constraint now prevents new duplicate staff_module_progress rows
  // (item 7, 18 Sep fix), but counting by row here was always the wrong
  // unit regardless of whether duplicates exist (one row per module
  // completed is the actual invariant this number represents).
  const completedByUser = new Map<string, Set<string>>();
  for (const p of progress ?? []) {
    if (p.status === "completed" && p.user_id && p.module_id) {
      if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set());
      completedByUser.get(p.user_id)!.add(p.module_id);
    }
  }

  const completionRows: StaffCompletionRow[] = (staff ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    roleName: s.staff_roles?.name ?? s.role,
    completed: completedByUser.get(s.id)?.size ?? 0,
    total: liveModuleCount,
  }));

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <h1 className="font-display text-3xl font-bold text-ink">Staff</h1>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wide text-clay-brown">Completion</h2>
          <StaffCompletionList staff={completionRows} />
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wide text-clay-brown">Roster</h2>
          {liveModuleCount === 0 && (staff ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">
              You can invite staff any time, but there&apos;s nothing for them to complete yet. Building a module
              first means a new hire has something real waiting on day one.
            </p>
          )}
          <InviteStaffForm />
          {viewer?.role === "manager" && (
            <p className="font-sans text-sm text-ink/75">You can move people between Frontline roles. Only the owner can give or remove an Authorized role.</p>
          )}
          <div className="space-y-3">
            {(staff ?? []).map((member) => (
              <div
                key={member.id}
                data-testid="staff-row"
                className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-ink">{member.name}</p>
                  <p className="font-mono text-xs text-clay-brown">
                    {member.staff_roles?.name ?? member.role}
                    {member.staff_roles?.department ? ` · ${member.staff_roles.department}` : ""}
                  </p>
                </div>
                <StaffLifecycleActions
                  staffUserId={member.id}
                  staffName={member.name}
                  canDeactivate={viewer?.role === "owner" || !isProtectedTarget(member)}
                />
                </div>
                <StaffRoleSelect
                  staffUserId={member.id}
                  staffName={member.name}
                  currentRoleId={member.staff_role_id}
                  currentTier={member.staff_roles ? (member.staff_roles.fallback_tier === "authorized" ? "authorized" : "frontline") : null}
                  roles={roleOptions}
                  viewerIsOwner={viewer?.role === "owner"}
                  isSelf={viewer?.id === member.id}
                  canChange={viewer?.role === "owner" || viewer?.role === "manager"}
                />
              </div>
            ))}
            {(staff ?? []).length === 0 && (
              <p className="font-sans text-sm text-clay-brown">No staff yet.</p>
            )}
          </div>
        </section>

        {(deactivatedStaff ?? []).length > 0 && (
          <section className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-wide text-clay-brown">Deactivated</h2>
            <p className="font-sans text-xs text-ink/60">
              Their completion history stays on record. See the Completion tracking page for full detail.
            </p>
            <div className="space-y-3">
              {(deactivatedStaff ?? []).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-clay-brown/20 px-4 py-4 opacity-70"
                >
                  <p className="font-display text-ink">{member.name}</p>
                  {viewer?.role === "owner" || !isProtectedTarget(member) ? (
                    <ReactivateStaffButton staffUserId={member.id} />
                  ) : (
                    <p className="max-w-48 font-sans text-xs text-clay-brown">Only the owner can reactivate someone with an Authorized role.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
