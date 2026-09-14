import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { PrintButton } from "@/components/owner/PrintButton";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Block S3 -- a dedicated, printable QR label per station: station name,
// the real QR code, Larder branding. Same browser-print pattern as Block R
// (a view page that doubles as the print page via window.print() and
// print:hidden chrome) -- no new PDF pipeline.
export default async function StationLabelPage({
  params,
}: {
  params: Promise<{ venueSlug: string; stationId: string }>;
}) {
  const { venueSlug, stationId } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: station, error: stationError }, { data: venue, error: venueError }] = await Promise.all([
    supabase.from("stations").select("id, name, qr_code_slug").eq("id", stationId).eq("venue_id", staff!.venue_id!).maybeSingle(),
    supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
  ]);
  logQueryError(`[${venueSlug}] station label station`, stationError);
  logQueryError(`[${venueSlug}] station label venue`, venueError);
  if (!station) notFound();

  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;
  const scanUrl = `${origin}/${venueSlug}/station/${station.qr_code_slug}`;
  const qrDataUrl = await QRCode.toDataURL(scanUrl, { margin: 1, width: 480 });

  return (
    <main className="min-h-screen bg-parchment px-6 py-10 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Link
            href={`/${venueSlug}/owner/stations`}
            className="font-mono text-xs uppercase tracking-wide text-clay-brown"
          >
            Back to stations
          </Link>
          <PrintButton label="Print label" />
        </div>

        <div className="rounded-2xl border-2 border-ink bg-white p-10 text-center print:border-0 print:p-0">
          <p className="font-mono text-xs uppercase tracking-wide text-preserve-red">Larder</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">{station.name}</h1>
          <p className="mt-1 font-sans text-sm text-ink/60">{venue?.name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL, no benefit from next/image */}
          <img src={qrDataUrl} alt={`QR code for ${station.name}`} className="mx-auto mt-6 h-56 w-56" />
          <p className="mt-5 font-mono text-xs uppercase tracking-wide text-clay-brown">Scan for training</p>
        </div>
      </div>
    </main>
  );
}
