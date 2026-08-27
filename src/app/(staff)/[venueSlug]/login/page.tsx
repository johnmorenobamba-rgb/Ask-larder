import { createClient } from "@/lib/supabase/server";
import { PinLoginForm } from "@/components/staff/PinLoginForm";

type VenueRoster = {
  venue: { id: string; name: string; branding: Record<string, unknown> } | null;
  staff: { id: string; name: string }[];
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { venueSlug } = await params;
  const { redirectTo } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.rpc("venue_roster", { p_slug: venueSlug });
  const roster = data as VenueRoster | null;

  if (!roster?.venue) {
    return (
      <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <p className="font-sans text-ink">
          Couldn&apos;t find this venue. Check the link and try again.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">{roster.venue.name}</h1>
        <PinLoginForm
          venueSlug={venueSlug}
          staff={roster.staff}
          redirectTo={redirectTo || `/${venueSlug}/welcome`}
        />
      </div>
    </main>
  );
}
