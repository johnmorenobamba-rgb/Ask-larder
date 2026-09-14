import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ShiftWindowsForm } from "@/components/owner/ShiftWindowsForm";

export default async function OwnerSettingsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: venue } = await supabase
    .from("venues")
    .select("shift_windows")
    .eq("id", staff!.venue_id!)
    .maybeSingle();

  const shiftWindows = (venue?.shift_windows as Record<string, string> | null) ?? {};

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
        <ShiftWindowsForm opening={shiftWindows.opening} closing={shiftWindows.closing} />
      </div>
    </main>
  );
}
