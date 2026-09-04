import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";
import { RoleSelectGrid } from "@/components/staff/RoleSelectGrid";

export default async function RolesPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);

  // Role determines everything downstream — once set, never show this
  // screen again. But "has a role" and "has finished onboarding" are two
  // different things (a role can be assigned by the owner before day one)
  // -- someone with a role who hasn't finished onboarding yet goes straight
  // to their module checklist, not back to the full home dashboard.
  if (staff.staff_role_id) {
    redirect(staff.onboarding_completed_at ? `/${venueSlug}/home` : `/${venueSlug}/modules`);
  }

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("staff_roles")
    .select("id, name, department")
    .eq("venue_id", staff.venue_id!)
    .order("name");

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <PassSlide>
        <div className="w-full max-w-md space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">What&apos;s your role?</h1>
          <RoleSelectGrid roles={roles ?? []} modulesHref={`/${venueSlug}/modules`} />
        </div>
      </PassSlide>
    </main>
  );
}
