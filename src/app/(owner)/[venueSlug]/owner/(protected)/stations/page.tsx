import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { getPhotoLibraryUrl } from "@/lib/owner/photoLibraryUrl";
import { CreateStationForm } from "@/components/owner/CreateStationForm";
import { DeleteStationButton } from "@/components/owner/DeleteStationButton";
import { StationModuleSelect } from "@/components/owner/StationModuleSelect";
import { StationPhotoUpload } from "@/components/owner/StationPhotoUpload";
import { NameplateCapture } from "@/components/owner/NameplateCapture";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function OwnerStationsPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const [{ data: stations, error: stationsError }, { data: modules, error: modulesError }] = await Promise.all([
    supabase
      .from("stations")
      .select("id, name, qr_code_slug, primary_module_id, equipment_manufacturer, equipment_model, equipment_serial, modules(title)")
      .order("name"),
    supabase.from("modules").select("id, title").eq("status", "live").order("title"),
  ]);
  logQueryError(`[${venueSlug}] owner stations stations`, stationsError);
  logQueryError(`[${venueSlug}] owner stations modules`, modulesError);

  const stationIds = (stations ?? []).map((s) => s.id);
  const { data: stationPhotos, error: stationPhotosError } =
    stationIds.length > 0
      ? await supabase
          .from("photo_library")
          .select("station_id, storage_path, created_at")
          .eq("tag", "station")
          .in("station_id", stationIds)
          .order("created_at", { ascending: false })
      : { data: [] as { station_id: string | null; storage_path: string; created_at: string | null }[], error: null };
  logQueryError(`[${venueSlug}] owner stations stationPhotos`, stationPhotosError);
  // Most recent photo per station -- rows are already newest-first, so the
  // first one seen per station_id wins.
  const photoPathByStation = new Map<string, string>();
  for (const p of stationPhotos ?? []) {
    if (p.station_id && !photoPathByStation.has(p.station_id)) photoPathByStation.set(p.station_id, p.storage_path);
  }

  const stationsWithDisplay = await Promise.all(
    (stations ?? []).map(async (s) => {
      const photoPath = photoPathByStation.get(s.id);
      return {
        ...s,
        qrDataUrl: await QRCode.toDataURL(`${origin}/${venueSlug}/station/${s.qr_code_slug}`),
        photoUrl: photoPath ? await getPhotoLibraryUrl(photoPath) : null,
      };
    }),
  );

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Stations & QR codes</h1>
          <p className="font-sans text-sm text-clay-brown">
            Each station gets a QR code staff can scan on the floor. Link a module, add a real photo, and print the label.
          </p>
        </div>

        <CreateStationForm modules={modules ?? []} />

        <div className="space-y-3">
          {stationsWithDisplay.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start gap-4 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URL / short-lived signed URL, neither benefits from next/image */}
              <img
                src={s.photoUrl ?? s.qrDataUrl}
                alt={s.photoUrl ? s.name : `QR code for ${s.name}`}
                className={s.photoUrl ? "h-20 w-20 rounded-xl object-cover" : "h-20 w-20"}
              />
              <div className="min-w-[220px] flex-1 space-y-2">
                <p className="font-display text-ink">{s.name}</p>
                <StationModuleSelect stationId={s.id} currentModuleId={s.primary_module_id} modules={modules ?? []} />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <StationPhotoUpload venueId={staff!.venue_id!} stationId={s.id} />
                  <Link
                    href={`/${venueSlug}/owner/stations/${s.id}/label`}
                    className="font-mono text-xs uppercase tracking-wide text-preserve-red underline"
                  >
                    View / print QR label
                  </Link>
                  <Link
                    href={`/${venueSlug}/owner/stations/${s.id}/content`}
                    className="font-mono text-xs uppercase tracking-wide text-clay-brown underline"
                  >
                    FAQs & troubleshooting
                  </Link>
                  <DeleteStationButton stationId={s.id} />
                </div>
                {/*
                  Wizard-adjacency fix (CLAUDE.md standing principle) --
                  the equipment onboarding step covers this for a new
                  venue going through the wizard, but Two Fires and every
                  other already-onboarded venue only reach stations
                  through this live page, so the same capture has to live
                  here too, not just in onboarding.
                */}
                {s.equipment_model || s.equipment_manufacturer || s.equipment_serial ? (
                  <p className="pt-1 font-mono text-xs text-bay-green">
                    Equipment: {[s.equipment_manufacturer, s.equipment_model].filter(Boolean).join(" ") || "model not recorded"}
                    {s.equipment_serial ? `, serial ${s.equipment_serial}` : ""}
                  </p>
                ) : (
                  <div className="space-y-1 pt-1">
                    <p className="font-sans text-xs text-ink/70">No nameplate on file yet.</p>
                    <NameplateCapture venueId={staff!.venue_id!} stationId={s.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {stationsWithDisplay.length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No stations yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
