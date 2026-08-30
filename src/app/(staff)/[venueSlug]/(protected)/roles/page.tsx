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
  // screen again.
  if (staff.staff_role_id) redirect(`/${venueSlug}/home`);

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
