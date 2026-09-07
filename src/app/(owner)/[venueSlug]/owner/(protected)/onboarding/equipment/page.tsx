import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { CreateStationForm } from "@/components/owner/CreateStationForm";
import { EquipmentContinueButton } from "@/components/onboarding/EquipmentContinueButton";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

// Q2 Page 8c — equipment/station inventory. Reuses the existing
// CreateStationForm/POST /api/owner/stations route unchanged, per the Block
// Q brief — stations is unchanged by this migration, no new route needed.
export default async function EquipmentPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: stations }, { data: modules }, { data: session }] = await Promise.all([
    supabase.from("stations").select("id, name, qr_code_slug").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("modules").select("id, title").eq("venue_id", staff!.venue_id!).order("title"),
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);
  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Equipment</h2>
        <p className="font-sans text-sm text-ink/70">
          Bar, cellar, or kitchen stations, whatever this venue actually has. Each one gets its own QR code
          once created here.
        </p>
      </div>

      <CreateStationForm modules={modules ?? []} />

      <div className="space-y-2">
        {(stations ?? []).map((s) => (
          <div key={s.id} className="rounded-2xl border-2 border-clay-brown/20 px-4 py-3">
            <p className="font-sans text-ink">{s.name}</p>
            <p className="font-mono text-xs text-clay-brown">{s.qr_code_slug}</p>
          </div>
        ))}
        {(stations ?? []).length === 0 && <p className="font-sans text-sm text-clay-brown">No stations yet.</p>}
      </div>

      <EquipmentContinueButton venueSlug={venueSlug} flags={flags} />
    </div>
  );
}
