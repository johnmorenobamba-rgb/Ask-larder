import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";
import { ModuleStateChip } from "@/components/staff/ModuleStateChip";
import { PressableLink } from "@/components/shared/PressableLink";

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, status, module_roles(role_id)")
    .eq("venue_id", staff.venue_id!)
    .in("status", ["approved", "live"]);

  // A module with zero module_roles rows is unrestricted (visible to every
  // role) — the exact semantics the old nullable modules.role_id column had.
  const visibleModules = (modules ?? []).filter(
    (m) =>
      m.module_roles.length === 0 ||
      m.module_roles.some((mr) => mr.role_id === staff.staff_role_id),
  );

  const moduleIds = visibleModules.map((m) => m.id);
  const { data: progress } =
    moduleIds.length > 0
      ? await supabase
          .from("staff_module_progress")
          .select("module_id, status")
          .eq("user_id", staff.id)
          .in("module_id", moduleIds)
      : { data: [] };

  const progressByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));

  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-lg space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-bold text-ink">Your modules</h1>
            <span className="font-mono text-xs text-clay-brown">
              {visibleModules.filter((m) => progressByModule.get(m.id) === "completed").length} of{" "}
              {visibleModules.length}
            </span>
          </div>
          {visibleModules.length === 0 ? (
            <p className="font-sans text-ink">
              No modules assigned yet — ask your supervisor to check your role is set up
              correctly.
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleModules.map((module) => (
                <li key={module.id}>
                  <PressableLink
                    href={`/${venueSlug}/modules/${module.id}`}
                    className="flex items-center gap-3 rounded-2xl border-2 border-clay-brown/20 px-4 py-4 hover:border-preserve-red"
                  >
                    <ModuleStateChip
                      state={(progressByModule.get(module.id) as "not_started" | "in_progress" | "completed") ?? "not_started"}
                    />
                    <span className="font-sans text-ink">{module.title}</span>
                  </PressableLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PassSlide>
    </main>
  );
}
