import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { CreateStationForm } from "@/components/owner/CreateStationForm";
import { DeleteStationButton } from "@/components/owner/DeleteStationButton";

export default async function OwnerStationsPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const supabase = await createClient();
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const [{ data: stations }, { data: modules }] = await Promise.all([
    supabase.from("stations").select("id, name, qr_code_slug, primary_module_id, modules(title)").order("name"),
    supabase.from("modules").select("id, title").eq("status", "live").order("title"),
  ]);

  const stationsWithQr = await Promise.all(
    (stations ?? []).map(async (s) => ({
      ...s,
      qrDataUrl: await QRCode.toDataURL(`${origin}/${venueSlug}/station/${s.qr_code_slug}`),
    })),
  );

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Stations & QR codes</h1>

        <CreateStationForm modules={modules ?? []} />

        <div className="space-y-3">
          {stationsWithQr.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URL, no benefit from next/image */}
              <img src={s.qrDataUrl} alt={`QR code for ${s.name}`} className="h-24 w-24" />
              <div className="flex-1">
                <p className="font-display text-ink">{s.name}</p>
                <p className="font-mono text-xs text-clay-brown">{s.modules?.title ?? "No module assigned"}</p>
                <DeleteStationButton stationId={s.id} />
              </div>
            </div>
          ))}
          {stationsWithQr.length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No stations yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
