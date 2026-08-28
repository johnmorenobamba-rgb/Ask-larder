import { createClient } from "@/lib/supabase/server";
import { StaffPinResetButton } from "@/components/owner/StaffPinResetButton";

export default async function OwnerStaffPage() {
  const supabase = await createClient();

  // app_users_select_own_venue (reconcile_schema_drift) scopes this to the
  // caller's own venue already -- no explicit venue_id filter needed.
  const { data: staff } = await supabase
    .from("app_users")
    .select("id, name, role, staff_roles(name, department)")
    .order("name");

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Staff</h1>
        <div className="space-y-3">
          {(staff ?? []).map((member) => (
            <div
              key={member.id}
              data-testid="staff-row"
              className="flex items-center justify-between rounded-2xl border-2 border-clay-brown/40 px-4 py-4"
            >
              <div>
                <p className="font-display text-ink">{member.name}</p>
                <p className="font-mono text-xs text-clay-brown">
                  {member.staff_roles?.name ?? member.role}
                  {member.staff_roles?.department ? ` · ${member.staff_roles.department}` : ""}
                </p>
              </div>
              <StaffPinResetButton staffUserId={member.id} />
            </div>
          ))}
          {(staff ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No staff yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
