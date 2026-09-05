import { createClient } from "@/lib/supabase/server";
import { LoginBackdrop } from "@/components/shared/LoginBackdrop";
import { VenueEntryGateway } from "@/components/venue/VenueEntryGateway";

type VenueRoster = {
  venue: { id: string; name: string; branding: Record<string, unknown> } | null;
};

// Build Manual Block M — replaces the bare `/[venueSlug]` root's previous
// 404 with a real branded landing page. Sibling to the existing
// `(staff)`/`(owner)` route groups, not inside either -- this page itself
// has no protected content, it only routes to their real login pages.
// Reuses the same anon-callable `venue_roster` RPC both of those login
// pages already call (name/branding only, no PINs/hashes) rather than a
// new query or RPC -- no new backend logic, per the locked scope.
export default async function VenueGatewayPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;

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

  const logoUrl =
    typeof roster.venue.branding?.logoUrl === "string" ? (roster.venue.branding.logoUrl as string) : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment px-6">
      <LoginBackdrop />
      <VenueEntryGateway venueSlug={venueSlug} venueName={roster.venue.name} logoUrl={logoUrl} />
    </main>
  );
}
