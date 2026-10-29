import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PressableLink } from "@/components/shared/PressableLink";
import { logQueryError } from "@/lib/supabase/logQueryError";

export const dynamic = "force-dynamic";

// Home of the shared venue iPad (venue iPad mode). No name, no progress: a picker for the stations, a link to read
// only training, and Ask Larder (floating, from the layout) at the lowest access level. Anything personal needs a PIN.
export default async function DeviceHomePage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  // A person who lands here goes to their own home.
  if (!staff.isDevice) redirect(`/${venueSlug}/home`);

  const supabase = await createClient();
  const { data: stations, error } = await supabase
    .from("stations")
    .select("id, name, qr_code_slug")
    .eq("venue_id", staff.venue_id!)
    .order("name");
  logQueryError(`[${venueSlug}] device home stations`, error);

  return (
    <main className="min-h-screen bg-parchment px-6 pb-24 pt-24">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Venue iPad</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">What do you need?</h1>
          <p className="mt-2 font-sans text-ink/70">
            Pick your station for answers and fixes, or ask Larder a question. Log in with your PIN for your own modules,
            certificates and forms.
          </p>
        </div>
        {(stations ?? []).length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(stations ?? []).map((s) => (
              <li key={s.id}>
                <PressableLink
                  href={`/${venueSlug}/station/${s.qr_code_slug}`}
                  className="block rounded-2xl border-2 border-clay-brown/40 px-5 py-6 hover:border-preserve-red"
                >
                  <span className="block font-display text-xl font-bold text-ink">{s.name}</span>
                </PressableLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-ink">No stations set up yet. Ask your manager.</p>
        )}
        <PressableLink
          href={`/${venueSlug}/modules`}
          className="block rounded-2xl border-2 border-ink px-5 py-5 hover:border-preserve-red"
        >
          <span className="block font-display text-xl font-bold text-ink">Training</span>
          <span className="mt-1 block font-sans text-sm text-ink/70">Read the training material. Log in to complete it.</span>
        </PressableLink>
      </div>
    </main>
  );
}
