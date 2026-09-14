import { createClient } from "@/lib/supabase/server";
import { PinLoginForm } from "@/components/staff/PinLoginForm";
import { LoginBackdrop } from "@/components/shared/LoginBackdrop";
import { logQueryError } from "@/lib/supabase/logQueryError";

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
  const { data, error } = await supabase.rpc("venue_roster", { p_slug: venueSlug });
  logQueryError(`[${venueSlug}] staff login venue_roster`, error);
  const roster = data as VenueRoster | null;

  if (error) {
    return (
      <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <p className="font-sans text-ink">Something went wrong loading this page. Try again in a moment.</p>
      </main>
    );
  }
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
    <main className="relative min-h-screen overflow-hidden bg-parchment flex items-center justify-center px-6">
      <LoginBackdrop />
      <div className="relative z-10 w-full max-w-sm space-y-6">
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
