import { createClient } from "@/lib/supabase/server";
import { OwnerLoginForm } from "@/components/owner/OwnerLoginForm";
import { LoginBackdrop } from "@/components/shared/LoginBackdrop";

type VenueRoster = {
  venue: { id: string; name: string; branding: Record<string, unknown> } | null;
};

export default async function OwnerLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { venueSlug } = await params;
  const { redirectTo } = await searchParams;

  // Reuses the same anon-callable RPC the staff login page uses -- it only
  // exposes name/branding (+ staff names, unused here), no PINs/hashes.
  const supabase = await createClient();
  const { data } = await supabase.rpc("venue_roster", { p_slug: venueSlug });
  const roster = data as VenueRoster | null;

  if (!roster?.venue) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parchment px-6">
        <p className="font-sans text-ink">Couldn&apos;t find this venue. Check the link and try again.</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment px-6">
      <LoginBackdrop />
      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div>
          <p className="font-mono text-xs text-clay-brown">Owner dashboard</p>
          <h1 className="font-display text-3xl font-bold text-ink">{roster.venue.name}</h1>
        </div>
        <OwnerLoginForm redirectTo={redirectTo || `/${venueSlug}/owner/dashboard`} />
      </div>
    </main>
  );
}
