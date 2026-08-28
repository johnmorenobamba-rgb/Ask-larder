import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function OwnerCertsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: certs }, { data: venue }] = await Promise.all([
    supabase
      .from("staff_certificates")
      .select("id, expiry_date, app_users(name), certificate_types(name)")
      .order("expiry_date"),
    supabase.from("venues").select("cert_nudge_cadence").eq("id", staff!.venue_id!).single(),
  ]);

  const cadence = (venue?.cert_nudge_cadence ?? [30, 14, 7]).sort((a, b) => a - b);
  const soonestThreshold = cadence[cadence.length - 1];

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Certificates</h1>
        <div className="space-y-3">
          {(certs ?? []).map((c) => {
            const days = c.expiry_date ? daysUntil(c.expiry_date) : null;
            const state = days === null ? "unknown" : days < 0 ? "expired" : days <= soonestThreshold ? "expiring" : "valid";
            const color =
              state === "expired" ? "border-preserve-red" : state === "expiring" ? "border-saffron" : "border-bay-green";
            const label =
              state === "expired"
                ? `Expired ${Math.abs(days!)} day(s) ago`
                : state === "expiring"
                  ? `Expires in ${days} day(s)`
                  : state === "valid"
                    ? `Expires ${c.expiry_date}`
                    : "No expiry date on file";
            return (
              <div key={c.id} className={`rounded-2xl border-2 ${color} px-4 py-4`}>
                <p className="font-display text-ink">{c.app_users?.name ?? "Unknown staff"}</p>
                <p className="font-mono text-xs text-clay-brown">{c.certificate_types?.name ?? "Unknown cert"}</p>
                <p className="font-sans text-sm text-ink">{label}</p>
              </div>
            );
          })}
          {(certs ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No certificates uploaded yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
