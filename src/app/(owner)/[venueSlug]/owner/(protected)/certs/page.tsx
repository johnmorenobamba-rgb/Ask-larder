import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { ScrollStackList } from "@/components/shared/ScrollStackList";
import { logQueryError } from "@/lib/supabase/logQueryError";
import type { TrackingType } from "@/lib/certs/certTracking";

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function OwnerCertsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: certs, error: certsError }, { data: venue, error: venueError }] = await Promise.all([
    supabase
      .from("staff_certificates")
      .select("id, expiry_date, app_users(name), certificate_types(name, tracking_type)")
      .order("expiry_date"),
    supabase.from("venues").select("cert_nudge_cadence").eq("id", staff!.venue_id!).single(),
  ]);
  logQueryError("owner certs certs", certsError);
  logQueryError("owner certs venue", venueError);

  const cadence = (venue?.cert_nudge_cadence ?? [30, 14, 7]).sort((a, b) => a - b);
  const soonestThreshold = cadence[cadence.length - 1];

  // hard_expiry (WWCC) keeps "expired"/"expires" language -- it's a real
  // legal deadline. recommended_refresher (RSA, Food Handling, Food Safety
  // Supervisor, First Aid) always reads as a refresher recommendation,
  // never as non-compliance, even once the recommended date has passed.
  // VIC-specific distinction -- see certTracking.ts.
  function statusFor(trackingType: TrackingType, days: number | null) {
    if (days === null) return { tier: "unknown" as const, color: "border-bay-green" };
    if (trackingType === "hard_expiry") {
      if (days < 0) return { tier: "expired" as const, color: "border-preserve-red" };
      if (days <= soonestThreshold) return { tier: "expiring" as const, color: "border-saffron" };
      return { tier: "valid" as const, color: "border-bay-green" };
    }
    if (days < 0) return { tier: "refresherOverdue" as const, color: "border-saffron" };
    if (days <= soonestThreshold) return { tier: "refresherSoon" as const, color: "border-saffron" };
    return { tier: "refresherUpcoming" as const, color: "border-bay-green" };
  }

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Certificates</h1>
        <ScrollStackList className="space-y-3">
          {(certs ?? []).map((c) => {
            const trackingType = (c.certificate_types?.tracking_type ?? "recommended_refresher") as TrackingType;
            const days = c.expiry_date ? daysUntil(c.expiry_date) : null;
            const { tier, color } = statusFor(trackingType, days);
            return (
              <div key={c.id} className={`rounded-2xl border-2 bg-parchment ${color} px-4 py-4`}>
                <p className="font-display text-ink">{c.app_users?.name ?? "Unknown staff"}</p>
                <p className="font-mono text-xs text-clay-brown">{c.certificate_types?.name ?? "Unknown cert"}</p>
                <p className="font-sans text-sm text-ink">
                  {tier === "expired" ? (
                    <>
                      Expired <AnimatedNumber value={Math.abs(days!)} animate /> day(s) ago
                    </>
                  ) : tier === "expiring" ? (
                    <>
                      Expires in <AnimatedNumber value={days!} animate /> day(s)
                    </>
                  ) : tier === "valid" ? (
                    `Expires ${c.expiry_date}`
                  ) : tier === "refresherOverdue" ? (
                    <>
                      Refresher recommended, overdue by <AnimatedNumber value={Math.abs(days!)} animate /> day(s)
                    </>
                  ) : tier === "refresherSoon" ? (
                    <>
                      Refresher recommended in <AnimatedNumber value={days!} animate /> day(s)
                    </>
                  ) : tier === "refresherUpcoming" ? (
                    `Refresher recommended by ${c.expiry_date}`
                  ) : (
                    "No date on file"
                  )}
                </p>
              </div>
            );
          })}
          {(certs ?? []).length === 0 && (
            <p className="font-sans text-sm text-clay-brown">No certificates uploaded yet.</p>
          )}
        </ScrollStackList>
      </div>
    </main>
  );
}
