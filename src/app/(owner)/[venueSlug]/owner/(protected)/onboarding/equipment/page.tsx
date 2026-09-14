import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { CreateStationForm } from "@/components/owner/CreateStationForm";
import { StationPhotoUpload } from "@/components/owner/StationPhotoUpload";
import { NameplateCapture } from "@/components/owner/NameplateCapture";
import { EquipmentContinueButton } from "@/components/onboarding/EquipmentContinueButton";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Q2 Page 8c — equipment/station inventory. Reuses the existing
// CreateStationForm/POST /api/owner/stations route unchanged, per the Block
// Q brief — stations is unchanged by this migration, no new route needed.
//
// Block U3 — station creation and QR generation were already one atomic,
// automatic step (qr_code_slug typed here, rendered live on the Stations
// page). The real gap was photo capture: it only ever existed post-hoc on
// that separate live page via StationPhotoUpload, so a photo happened only
// if John remembered to go back later. Reusing that exact component here,
// inline, right where the station is created, means the photo (and the
// printable QR label, already fully working) can happen the same day, on
// site.
export default async function EquipmentPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [
    { data: stations, error: stationsError },
    { data: modules, error: modulesError },
    { data: session, error: sessionError },
    { data: stationPhotos, error: stationPhotosError },
  ] = await Promise.all([
    supabase
      .from("stations")
      .select("id, name, qr_code_slug, equipment_manufacturer, equipment_model, equipment_serial, nameplate_photo_id")
      .eq("venue_id", staff!.venue_id!)
      .order("name"),
    supabase.from("modules").select("id, title").eq("venue_id", staff!.venue_id!).order("title"),
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
    supabase.from("photo_library").select("station_id").eq("venue_id", staff!.venue_id!).eq("tag", "station"),
  ]);
  logQueryError(`[${venueSlug}] onboarding equipment stations`, stationsError);
  logQueryError(`[${venueSlug}] onboarding equipment modules`, modulesError);
  logQueryError(`[${venueSlug}] onboarding equipment session`, sessionError);
  logQueryError(`[${venueSlug}] onboarding equipment stationPhotos`, stationPhotosError);
  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};
  const stationsWithPhotos = new Set((stationPhotos ?? []).map((p) => p.station_id));

  return (
    <div className="space-y-6">
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("equipment", flags)} />
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Equipment</h2>
        <p className="font-sans text-sm text-ink/70">
          Bar, cellar, or kitchen stations, whatever this venue actually has. Each one gets its own QR code
          once created here.
        </p>
      </div>

      <CreateStationForm modules={modules ?? []} />

      <div className="space-y-2">
        {(stations ?? []).map((s) => {
          const hasPhoto = stationsWithPhotos.has(s.id);
          return (
            <div key={s.id} className="space-y-2 rounded-2xl border-2 border-clay-brown/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-ink">{s.name}</p>
                  <p className="font-mono text-xs text-clay-brown">{s.qr_code_slug}</p>
                </div>
                <Link
                  href={`/${venueSlug}/owner/stations/${s.id}/label`}
                  className="rounded-full border-2 border-clay-brown/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink"
                >
                  Print QR label
                </Link>
              </div>
              {hasPhoto ? (
                <p className="font-sans text-xs text-bay-green">Photo captured.</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-ink/70">Take a photo of {s.name} now, while you&apos;re standing in front of it.</p>
                  <StationPhotoUpload venueId={staff!.venue_id!} stationId={s.id} />
                </div>
              )}

              {/*
                Wizard-adjacency fix (CLAUDE.md standing principle) --
                separate from the ambience photo above. This one is
                specifically the nameplate/model sticker, OCR'd into
                editable manufacturer/model/serial fields the owner
                confirms, feeding the manufacturer-sourced content
                pipeline. Shown whenever equipment_model isn't set yet,
                regardless of whether the general station photo above
                exists -- an existing "photo captured" flag never meant a
                nameplate was actually photographed.
              */}
              {s.equipment_model || s.equipment_manufacturer || s.equipment_serial ? (
                <div className="rounded-xl border-2 border-bay-green/40 bg-bay-green/10 px-3 py-2">
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Equipment on file</p>
                  <p className="font-sans text-sm text-ink">
                    {[s.equipment_manufacturer, s.equipment_model].filter(Boolean).join(" ") || "Model not recorded"}
                    {s.equipment_serial ? `, serial ${s.equipment_serial}` : ""}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-ink/70">
                    Now photograph {s.name}&apos;s nameplate or model sticker specifically, the equipment can look up
                    its real manual once this is on file.
                  </p>
                  <NameplateCapture venueId={staff!.venue_id!} stationId={s.id} />
                </div>
              )}
            </div>
          );
        })}
        {(stations ?? []).length === 0 && <p className="font-sans text-sm text-clay-brown">No stations yet.</p>}
      </div>

      <EquipmentContinueButton venueSlug={venueSlug} flags={flags} />
    </div>
  );
}
